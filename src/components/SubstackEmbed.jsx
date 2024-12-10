import React, { useEffect } from "react";

const SubstackEmbed = () => {
  useEffect(() => {
    const substackConfigScript = document.createElement("script");
    substackConfigScript.innerHTML = `
      window.SubstackFeedWidget = {
        substackUrl: "williammulvaney.substack.com",
        posts: 3,
        hidden: ["author"]
      };
    `;
    document.body.appendChild(substackConfigScript);

    const substackEmbedScript = document.createElement("script");
    substackEmbedScript.src = "https://substackapi.com/embeds/feed.js";
    substackEmbedScript.async = true;
    document.body.appendChild(substackEmbedScript);

    return () => {
      document.body.removeChild(substackConfigScript);
      document.body.removeChild(substackEmbedScript);
    };
  }, []);

  return (
    <div>
      <div id="substack-feed-embed"></div>

      {/* Add your iframe here */}
      <iframe
        title="Substack Embed"
        src="https://williammulvaney.substack.com/embed"
        width="480"
        height="320"
        style={{ border: "1px solid #EEE", background: "white" }}
        frameBorder="0"
        scrolling="yes"
      ></iframe>
    </div>
  );
};

export default SubstackEmbed;