document.addEventListener("DOMContentLoaded", function() {
    var apiKeyInput = document.getElementById("apiKey");
    var modelSelect = document.getElementById("modelName");
    var saveBtn = document.getElementById("saveBtn");
    var status = document.getElementById("status");

                            // Load saved settings
                            chrome.storage.sync.get(
                              { apiKey: "", modelName: "claude-sonnet-4-20250514" },
                                  function(data) {
                                          apiKeyInput.value = data.apiKey;
                                          modelSelect.value = data.modelName;
                                  }
                                );

                            // Save settings
                            saveBtn.addEventListener("click", function() {
                                  var apiKey = apiKeyInput.value.trim();
                                  var modelName = modelSelect.value;

                                                         if (!apiKey) {
                                                                 status.style.color = "#f87171";
                                                                 status.textContent = "Please enter an API key";
                                                                 return;
                                                         }

                                                         chrome.storage.sync.set({ apiKey: apiKey, modelName: modelName }, function() {
                                                                 status.style.color = "#4ade80";
                                                                 status.textContent = "Saved!";
                                                                 setTimeout(function() {
                                                                           status.textContent = "";
                                                                 }, 2000);
                                                         });
                            });
});
