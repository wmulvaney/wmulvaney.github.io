import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import 'health_sync.dart';

const _bg = Color(0xFF070B16);
const _port = 8137;

final _server = InAppLocalhostServer(documentRoot: 'assets/www', port: _port);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  await _server.start();
  runApp(const SleeperApp());
}

class SleeperApp extends StatelessWidget {
  const SleeperApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SLEEPER',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(brightness: Brightness.dark, scaffoldBackgroundColor: _bg),
      home: const GameScreen(),
    );
  }
}

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> with WidgetsBindingObserver {
  InAppWebViewController? _web;
  bool _loaded = false;
  DateTime? _lastSync;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Coming back to the app (e.g. in the morning) pulls fresh nights.
    if (state == AppLifecycleState.resumed) _syncSleep();
  }

  Future<void> _syncSleep() async {
    final web = _web;
    if (web == null || !_loaded) return;
    final last = _lastSync;
    if (last != null && DateTime.now().difference(last).inMinutes < 15) return;
    _lastSync = DateTime.now();

    final nights = await HealthSync.fetchRecentNights();
    if (nights.isEmpty) return;
    await web.evaluateJavascript(
      source: 'window.__sleeperNative && '
          'window.__sleeperNative.pushNights(${jsonEncode(nights)})',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: Stack(
        children: [
          InAppWebView(
            initialUrlRequest: URLRequest(url: WebUri('http://localhost:$_port/index.html')),
            initialSettings: InAppWebViewSettings(
              transparentBackground: true,
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserGesture: false,
              disallowOverScroll: true,
              allowsBackForwardNavigationGestures: false,
            ),
            onWebViewCreated: (c) => _web = c,
            onLoadStop: (c, url) {
              if (!_loaded) setState(() => _loaded = true);
              _syncSleep();
            },
          ),
          // Solid cover until the game paints, so there's no white flash.
          if (!_loaded)
            const ColoredBox(
              color: _bg,
              child: Center(
                child: CircularProgressIndicator(color: Color(0xFF22D3EE)),
              ),
            ),
        ],
      ),
    );
  }
}
