chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'getProductImage') {
    getProductImageUrl().then(sendResponse);
    return true; // Indicates we will send a response asynchronously
  }
});

async function getProductImageUrl() {
  let productImageUrl = document.querySelector(
    'meta[property="og:image"]'
  )?.content;

  if (!productImageUrl) {
    productImageUrl = document.querySelector(
      'meta[name="twitter:image"]'
    )?.content;
  }

  if (!productImageUrl) {
    return { productImageUrl: null };
  }

  return { productImageUrl };
}
