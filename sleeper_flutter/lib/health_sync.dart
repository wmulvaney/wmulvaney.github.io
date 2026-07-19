import 'package:health/health.dart';

/// Reads sleep from Apple Health (iOS) / Health Connect (Android) and folds
/// the raw stage segments into per-night summaries the game understands:
/// { date, hours, efficiency, deep, rem }.
class HealthSync {
  static const _types = [
    HealthDataType.SLEEP_ASLEEP,
    HealthDataType.SLEEP_LIGHT,
    HealthDataType.SLEEP_DEEP,
    HealthDataType.SLEEP_REM,
    HealthDataType.SLEEP_AWAKE,
    HealthDataType.SLEEP_IN_BED,
  ];

  static final _health = Health();
  static bool _configured = false;

  static Future<bool> authorize() async {
    if (!_configured) {
      await _health.configure();
      _configured = true;
    }
    final has = await _health.hasPermissions(_types);
    if (has == true) return true;
    try {
      return await _health.requestAuthorization(_types);
    } catch (_) {
      return false;
    }
  }

  /// Returns nights sorted oldest-first, one entry per wake-up date.
  static Future<List<Map<String, Object?>>> fetchRecentNights({int days = 14}) async {
    if (!await authorize()) return [];

    final now = DateTime.now();
    List<HealthDataPoint> points;
    try {
      points = await _health.getHealthDataFromTypes(
        startTime: now.subtract(Duration(days: days)),
        endTime: now,
        types: _types,
      );
      points = _health.removeDuplicates(points);
    } catch (_) {
      return [];
    }

    // Bucket segments by the night they belong to (keyed on wake-up date —
    // a segment ending before 15:00 counts toward that day's morning).
    final buckets = <String, _Night>{};
    for (final p in points) {
      final end = p.dateTo;
      final wake = end.hour < 15 ? end : end.add(const Duration(days: 1));
      final key = '${wake.year.toString().padLeft(4, '0')}-'
          '${wake.month.toString().padLeft(2, '0')}-'
          '${wake.day.toString().padLeft(2, '0')}';
      final n = buckets.putIfAbsent(key, () => _Night());
      final minutes = end.difference(p.dateFrom).inSeconds / 60.0;
      switch (p.type) {
        case HealthDataType.SLEEP_DEEP:
          n.deep += minutes;
          n.asleep += minutes;
        case HealthDataType.SLEEP_REM:
          n.rem += minutes;
          n.asleep += minutes;
        case HealthDataType.SLEEP_LIGHT:
        case HealthDataType.SLEEP_ASLEEP:
          n.asleep += minutes;
        case HealthDataType.SLEEP_AWAKE:
          n.awake += minutes;
        case HealthDataType.SLEEP_IN_BED:
          n.inBed += minutes;
        default:
          break;
      }
    }

    final nights = <Map<String, Object?>>[];
    final keys = buckets.keys.toList()..sort();
    for (final key in keys) {
      final n = buckets[key]!;
      if (n.asleep < 120) continue; // naps and partial data don't count as a night
      final inBed = [n.inBed, n.asleep + n.awake].reduce((a, b) => a > b ? a : b);
      nights.add({
        'date': key,
        'hours': double.parse((n.asleep / 60).toStringAsFixed(2)),
        'efficiency': inBed > 0
            ? double.parse((n.asleep / inBed).clamp(0.5, 1.0).toStringAsFixed(3))
            : null,
        // Stage fractions only when the device actually recorded stages.
        'deep': n.deep > 0 ? double.parse((n.deep / n.asleep).toStringAsFixed(3)) : null,
        'rem': n.rem > 0 ? double.parse((n.rem / n.asleep).toStringAsFixed(3)) : null,
      });
    }
    return nights;
  }
}

class _Night {
  double asleep = 0, deep = 0, rem = 0, awake = 0, inBed = 0;
}
