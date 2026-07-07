chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "ADAPT_PAGE") {
    const paragraphTexts = message.text.split("\n\n");

    setTimeout(() => {
      sendResponse({
        success: true,
        adapted: paragraphTexts.map((text) => {
          const sentences = text.split(". ");
          return sentences
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .join(".\n");
        }),
      });
    }, 2000);

    return true;
  }

  if (message.type === "GET_SUMMARY") {
    setTimeout(() => {
      sendResponse({
        success: true,
        summary: [
          "This article covers a major recent news event.",
          "Key people and organisations are involved in the situation.",
          "The outcome is still developing with more updates expected.",
          "Experts have shared different views on what happens next.",
        ],
      });
    }, 1500);

    return true;
  }

  if (message.type === "FETCH_DEFINITION") {
    const word = message.word;
    fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + word)
      .then(r => {
        if (!r.ok) { sendResponse(null); return; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        const firstMeaning = data[0] && data[0].meanings && data[0].meanings[0];
        const pos = (firstMeaning && firstMeaning.partOfSpeech) || "";
        const def = (firstMeaning && firstMeaning.definitions && firstMeaning.definitions[0] && firstMeaning.definitions[0].definition) || "";
        if (!def) { sendResponse(null); return; }
        const definition = def.length > 100 ? def.slice(0, 97) + "..." : def;
        sendResponse({ pos, definition });
      })
      .catch(() => sendResponse(null));
    return true;
  }

  return false;
});
