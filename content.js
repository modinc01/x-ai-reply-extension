// ===================================================
// X AI Reply Generator - Content Script (Claude API)
// ===================================================

(function () {
    "use strict";

   const BUTTON_LABEL = "AI\u8FD4\u4FE1";
    const OBSERVE_INTERVAL = 1500;

   // ---------- Claude API \u3067\u30EA\u30D7\u30E9\u30A4\u751F\u6210 ----------
   async function generateReply(tweetText, authorName, tone) {
         const { apiKey, modelName } = await new Promise((resolve) => {
                 chrome.storage.sync.get(
                   { apiKey: "", modelName: "claude-sonnet-4-20250514" },
                           resolve
                         );
         });

      if (!apiKey) {
              throw new Error(
                        "API\u30AD\u30FC\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002\n\u62E1\u5F35\u6A5F\u80FD\u306E\u30A2\u30A4\u30B3\u30F3\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
                      );
      }

      const tonePrompts = {
              friendly: "\u30D5\u30EC\u30F3\u30C9\u30EA\u30FC\u3067\u89AA\u3057\u307F\u3084\u3059\u3044\u53E3\u8ABF",
              formal: "\u4E01\u5BE7\u3067\u30D5\u30A9\u30FC\u30DE\u30EB\u306A\u53E3\u8ABF",
              funny: "\u30E6\u30FC\u30E2\u30A2\u3092\u4EA4\u3048\u305F\u697D\u3057\u3044\u53E3\u8ABF",
              agree: "\u5171\u611F\u30FB\u540C\u610F\u3092\u793A\u3059\u53E3\u8ABF",
              question: "\u8208\u5473\u3092\u6301\u3063\u3066\u8CEA\u554F\u3059\u308B\u53E3\u8ABF",
      };

      const toneInstruction = tonePrompts[tone] || tonePrompts.friendly;

      const systemPrompt = "\u3042\u306A\u305F\u306FX(Twitter)\u3067\u30EA\u30D7\u30E9\u30A4\u3092\u66F8\u304F\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002\n\u4EE5\u4E0B\u306E\u30EB\u30FC\u30EB\u306B\u5F93\u3063\u3066\u304F\u3060\u3055\u3044\uFF1A\n- " + toneInstruction + "\u3067\u8FD4\u4FE1\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\n- 140\u6587\u5B57\u4EE5\u5185\u306B\u53CE\u3081\u3066\u304F\u3060\u3055\u3044\n- \u81EA\u7136\u306A\u65E5\u672C\u8A9E\u306E\u30C4\u30A4\u30FC\u30C8\u3089\u3057\u3044\u6587\u4F53\u306B\u3057\u3066\u304F\u3060\u3055\u3044\n- \u30CF\u30C3\u30B7\u30E5\u30BF\u30B0\u306F\u4ED8\u3051\u306A\u3044\u3067\u304F\u3060\u3055\u3044\n- \u30EA\u30D7\u30E9\u30A4\u672C\u6587\u306E\u307F\u3092\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\uFF08\u4F59\u8A08\u306A\u8AAC\u660E\u306F\u4E0D\u8981\uFF09";

      const response = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                        "Content-Type": "application/json",
                        "x-api-key": apiKey,
                        "anthropic-version": "2023-06-01",
                        "anthropic-dangerous-direct-browser-access": "true",
              },
              body: JSON.stringify({
                        model: modelName,
                        max_tokens: 256,
                        system: systemPrompt,
                        messages: [
                          {
                                        role: "user",
                                        content: "\u4EE5\u4E0B\u306E\u30DD\u30B9\u30C8\uFF08@" + authorName + "\uFF09\u306B\u5BFE\u3059\u308B\u30EA\u30D7\u30E9\u30A4\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A\n\n\u300C" + tweetText + "\u300D",
                          },
                                  ],
              }),
      });

      if (!response.ok) {
              const err = await response.json().catch(() => ({}));
              throw new Error(
                        "API \u30A8\u30E9\u30FC (" + response.status + "): " + (err.error?.message || "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC")
                      );
      }

      const data = await response.json();
         return data.content[0].text.trim();
   }

   // ---------- UI\u3092\u8868\u793A ----------
   function showReplyPopup(tweetText, authorName, articleEl) {
         closePopup();

      const overlay = document.createElement("div");
         overlay.className = "xai-overlay";
         overlay.addEventListener("click", closePopup);

      const popup = document.createElement("div");
         popup.className = "xai-reply-popup";

      let currentTone = "friendly";

      popup.innerHTML = '<h3>\u2728 AI \u30EA\u30D7\u30E9\u30A4\u751F\u6210</h3>' +
              '<div class="xai-original-text"></div>' +
              '<div style="margin-bottom:8px; font-size:13px; color:#888;">\u30C8\u30FC\u30F3\u3092\u9078\u629E:</div>' +
              '<div class="xai-tone-selector">' +
              '<button class="xai-tone-btn active" data-tone="friendly">\uD83D\uDE0A \u30D5\u30EC\u30F3\u30C9\u30EA\u30FC</button>' +
              '<button class="xai-tone-btn" data-tone="formal">\uD83C\uDFA9 \u30D5\u30A9\u30FC\u30DE\u30EB</button>' +
              '<button class="xai-tone-btn" data-tone="funny">\uD83D\uDE02 \u30E6\u30FC\u30E2\u30A2</button>' +
              '<button class="xai-tone-btn" data-tone="agree">\uD83D\uDC4D \u5171\u611F</button>' +
              '<button class="xai-tone-btn" data-tone="question">\uD83E\uDD14 \u8CEA\u554F</button>' +
              '</div>' +
              '<div class="xai-error" style="display:none;"></div>' +
              '<textarea placeholder="\u3053\u3053\u306BAI\u751F\u6210\u306E\u30EA\u30D7\u30E9\u30A4\u304C\u8868\u793A\u3055\u308C\u307E\u3059..."></textarea>' +
              '<div class="xai-actions">' +
              '<button class="xai-btn xai-btn-secondary xai-close-btn">\u30AD\u30E3\u30F3\u30BB\u30EB</button>' +
              '<button class="xai-btn xai-btn-regenerate xai-regen-btn">\uD83D\uDD04 \u518D\u751F\u6210</button>' +
              '<button class="xai-btn xai-btn-primary xai-use-btn">\uD83D\uDCDD \u3053\u306E\u5185\u5BB9\u3067\u8FD4\u4FE1</button>' +
              '</div>';

      popup.querySelector(".xai-original-text").textContent = "@" + authorName + ": " + tweetText;

      document.body.appendChild(overlay);
         document.body.appendChild(popup);

      const textarea = popup.querySelector("textarea");
         const errorDiv = popup.querySelector(".xai-error");
         const toneButtons = popup.querySelectorAll(".xai-tone-btn");

      toneButtons.forEach(function(btn) {
              btn.addEventListener("click", function() {
                        toneButtons.forEach(function(b) { b.classList.remove("active"); });
                        btn.classList.add("active");
                        currentTone = btn.dataset.tone;
              });
      });

      async function doGenerate() {
              textarea.value = "\u751F\u6210\u4E2D...";
              textarea.disabled = true;
              errorDiv.style.display = "none";

           try {
                     const reply = await generateReply(tweetText, authorName, currentTone);
                     textarea.value = reply;
           } catch (e) {
                     errorDiv.textContent = e.message;
                     errorDiv.style.display = "block";
                     textarea.value = "";
           } finally {
                     textarea.disabled = false;
           }
      }

      doGenerate();

      popup.querySelector(".xai-regen-btn").addEventListener("click", doGenerate);
         popup.querySelector(".xai-close-btn").addEventListener("click", closePopup);

      popup.querySelector(".xai-use-btn").addEventListener("click", function() {
              var replyText = textarea.value;
              if (!replyText || replyText === "\u751F\u6210\u4E2D...") return;
              closePopup();
              insertReplyToTweet(articleEl, replyText);
      });
   }

   function closePopup() {
         document.querySelectorAll(".xai-overlay, .xai-reply-popup").forEach(function(el) { el.remove(); });
   }

   // ---------- X\u306E\u8FD4\u4FE1\u6B04\u306B\u30C6\u30AD\u30B9\u30C8\u3092\u633F\u5165 ----------
   function insertReplyToTweet(articleEl, replyText) {
         var replyButton = articleEl.querySelector('[data-testid="reply"]');
         if (replyButton) {
                 replyButton.click();

           setTimeout(function() {
                     var replyBox = document.querySelector('[data-testid="tweetTextarea_0"]');
                     if (replyBox) {
                                 replyBox.focus();
                                 document.execCommand("insertText", false, replyText);
                     }
           }, 800);
         }
   }

   // ---------- \u5404\u30C4\u30A4\u30FC\u30C8\u306B\u30DC\u30BF\u30F3\u3092\u633F\u5165 ----------
   function addAIReplyButtons() {
         var articles = document.querySelectorAll("article");

      articles.forEach(function(article) {
              if (article.querySelector(".xai-reply-btn")) return;

                             var actionGroup = article.querySelector('[role="group"]');
              if (!actionGroup) return;

                             var tweetTextEl = article.querySelector('[data-testid="tweetText"]');
              if (!tweetTextEl) return;

                             var userNameEl = article.querySelector('[data-testid="User-Name"]');

                             var authorName = "unknown";
              if (userNameEl) {
                        var match = userNameEl.textContent.match(/@(\w+)/);
                        if (match) authorName = match[1];
              }

                             var btn = document.createElement("button");
              btn.className = "xai-reply-btn";
              btn.innerHTML = '<span class="xai-icon">\u2728</span> AI\u8FD4\u4FE1';
              btn.title = "AI\u3067\u30EA\u30D7\u30E9\u30A4\u3092\u81EA\u52D5\u751F\u6210";

                             btn.addEventListener("click", function(e) {
                                       e.preventDefault();
                                       e.stopPropagation();
                                       var tweetText = tweetTextEl.textContent;
                                       showReplyPopup(tweetText, authorName, article);
                             });

                             actionGroup.appendChild(btn);
      });
   }

   // ---------- DOM\u76E3\u8996 ----------
   function startObserving() {
         addAIReplyButtons();

      var observer = new MutationObserver(function() {
              addAIReplyButtons();
      });

      observer.observe(document.body, {
              childList: true,
              subtree: true,
      });

      setInterval(addAIReplyButtons, OBSERVE_INTERVAL);
   }

   if (document.readyState === "loading") {
         document.addEventListener("DOMContentLoaded", startObserving);
   } else {
         startObserving();
   }
})();
