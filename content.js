chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'getProductImages') {
    getProductImages().then(sendResponse);
    return true; // Indicates we will send a response asynchronously
  }
});

async function getProductImages() {
  let images = [];

  const ogImage = document.querySelector('meta[property="og:image"]')?.content;
  if (ogImage) images.push(ogImage);

  const twImage = document.querySelector('meta[name="twitter:image"]')?.content;
  if (twImage) images.push(twImage);

  const imgElements = document.querySelectorAll('img');
  for (const img of imgElements) {
    if ((img.width > 150 || img.naturalWidth > 150) && img.src) {
      images.push(img.src);
    }
  }

  // Ensure unique URLs
  const uniqueImages = [...new Set(images)];

  return { productImages: uniqueImages };
}
