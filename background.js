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

  return false;
});
