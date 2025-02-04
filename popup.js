document.addEventListener('DOMContentLoaded', function () {
  const tryOnButton = document.getElementById('tryOn');
  const resultDiv = document.getElementById('result');
  const loader = document.getElementById('loader');
  const loadingMessage = document.getElementById('loadingMessage');
  const personImageInput = document.getElementById('personImage');
  const cachedImagesDiv = document.getElementById('cachedImages');

  let selectedImageUrl = null;

  // Load and display cached images
  loadCachedImages();

  // Load and display last result
  loadLastResult();

  // Create and append the upload new image button
  const uploadNewImage = document.createElement('label');
  uploadNewImage.id = 'uploadNewImage';
  uploadNewImage.textContent = '+';
  uploadNewImage.setAttribute('for', 'personImage');
  cachedImagesDiv.appendChild(uploadNewImage);

  personImageInput.addEventListener('change', function () {
    if (this.files.length > 0) {
      const file = this.files[0];
      const reader = new FileReader();
      reader.onload = function (e) {
        uploadNewImage.innerHTML = `
          <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;">
          <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; color: white; text-shadow: 0 0 3px rgba(0,0,0,0.5);">+</span>
        `;
      };
      reader.readAsDataURL(file);
      tryOnButton.disabled = false;
      selectedImageUrl = null;
      // Deselect any previously selected cached image
      document
        .querySelectorAll('.cached-image')
        .forEach((img) => img.classList.remove('selected'));
    } else {
      resetUploadButton();
      tryOnButton.disabled = !selectedImageUrl;
    }
  });

  tryOnButton.addEventListener('click', function () {
    if (selectedImageUrl) {
      startVirtualTryOn(selectedImageUrl);
    } else if (personImageInput.files.length > 0) {
      const personImageFile = personImageInput.files[0];
      uploadImgToHf(personImageFile)
        .then((personImageUrl) => {
          const newCachedImage = cacheImage(personImageUrl);
          selectCachedImage(newCachedImage, personImageUrl);
          startVirtualTryOn(personImageUrl);
          resetUploadButton();
        })
        .catch((error) => {
          showError('Error: ' + error.message);
          console.error('Error uploading image to Cloudinary:', error);
        });
    } else {
      alert('Please select an image or upload a new one.');
    }
  });

  function resetUploadButton() {
    uploadNewImage.innerHTML = '<span style="font-size: 24px;">+</span>';
  }

  function startVirtualTryOn(personImageUrl) {
    loader.style.display = 'block';
    loadingMessage.style.display = 'block';
    resultDiv.textContent = '';
    tryOnButton.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentPageUrl = tabs[0].url; // Get the current page URL
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          files: ['content.js'],
        },
        () => {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: 'getProductImage' },
            async function (response) {
              if (response && response.productImageUrl) {
                const productHFImageUrl = await uploadProductImg(
                  response.productImageUrl
                );
                performVirtualTryOn(
                  personImageUrl,
                  productHFImageUrl,
                  currentPageUrl
                );
              } else {
                showError("Couldn't find product image.");
              }
            }
          );
        }
      );
    });
  }

  function loadCachedImages() {
    const cachedData = JSON.parse(
      localStorage.getItem('cachedImageData') || '[]'
    );

    // Filter out expired images (older than 24 hours)
    const currentTime = new Date().getTime();
    const validCachedData = cachedData.filter((item) => {
      return currentTime - item.timestamp < 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    });

    // Update storage with only valid images
    localStorage.setItem('cachedImageData', JSON.stringify(validCachedData));

    validCachedData.forEach((item) => {
      const imgContainer = document.createElement('div');
      imgContainer.classList.add('image-container');

      const img = document.createElement('img');
      img.src =
        'https://kwai-kolors-kolors-virtual-try-on.hf.space/file=' + item.url;
      img.classList.add('cached-image');
      img.addEventListener('click', () => selectCachedImage(img, item.url));

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '×';
      deleteBtn.classList.add('delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCachedImage(item.url, imgContainer);
      });

      imgContainer.appendChild(img);
      imgContainer.appendChild(deleteBtn);
      cachedImagesDiv.appendChild(imgContainer);
    });
  }

  function deleteCachedImage(url, imgContainer) {
    // Remove from localStorage
    const cachedData = JSON.parse(
      localStorage.getItem('cachedImageData') || '[]'
    );
    const updatedData = cachedData.filter((item) => item.url !== url);
    localStorage.setItem('cachedImageData', JSON.stringify(updatedData));

    // Remove from DOM
    cachedImagesDiv.removeChild(imgContainer);

    // Reset selection if the deleted image was selected
    if (selectedImageUrl === url) {
      selectedImageUrl = null;
      tryOnButton.disabled = true;
    }
  }

  function selectCachedImage(imgElement, url) {
    document
      .querySelectorAll('.cached-image')
      .forEach((img) => img.classList.remove('selected'));
    imgElement.classList.add('selected');
    selectedImageUrl = url;
    tryOnButton.disabled = false;
    personImageInput.value = '';
    resetUploadButton();
  }

  function cacheImage(url) {
    const cachedData = JSON.parse(
      localStorage.getItem('cachedImageData') || '[]'
    );

    // Create new image data object with timestamp
    const newImageData = {
      url: url,
      timestamp: new Date().getTime(),
    };

    if (!cachedData.some((item) => item.url === url)) {
      cachedData.unshift(newImageData);
      if (cachedData.length > 5) cachedData.pop(); // Keep only the last 5 images
      localStorage.setItem('cachedImageData', JSON.stringify(cachedData));

      const imgContainer = document.createElement('div');
      imgContainer.classList.add('image-container');

      const img = document.createElement('img');
      img.src =
        'https://kwai-kolors-kolors-virtual-try-on.hf.space/file=' + url;
      img.classList.add('cached-image');
      img.addEventListener('click', () => selectCachedImage(img, url));

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '×';
      deleteBtn.classList.add('delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCachedImage(url, imgContainer);
      });

      imgContainer.appendChild(img);
      imgContainer.appendChild(deleteBtn);
      cachedImagesDiv.insertBefore(imgContainer, uploadNewImage);

      if (cachedImagesDiv.querySelectorAll('.image-container').length > 5) {
        cachedImagesDiv.removeChild(
          cachedImagesDiv.children[cachedImagesDiv.children.length - 2]
        );
      }

      return img; // Return the newly created image element
    }
    return null;
  }

  function showError(message) {
    loader.style.display = 'none';
    loadingMessage.style.display = 'none';
    resultDiv.innerHTML = message;
    tryOnButton.disabled = false;
  }

  function performVirtualTryOn(
    personImageUrl,
    productImageUrl,
    currentPageUrl
  ) {
    loadingMessage.textContent =
      'This may take about a minute. We appreciate your patience';
    const payload = {
      data: [
        {
          path: personImageUrl,
          url:
            'https://kwai-kolors-kolors-virtual-try-on.hf.space/file=' +
            personImageUrl,
          is_stream: false,
          meta: { _type: 'gradio.FileData' },
        },
        {
          path: productImageUrl,
          url:
            'https://kwai-kolors-kolors-virtual-try-on.hf.space/file=' +
            productImageUrl,
          is_stream: false,
          meta: { _type: 'gradio.FileData' },
        },
        0,
        true,
      ],
      fn_index: 2,
      trigger_id: 26,
      session_hash: Math.random().toString(36).substring(2),
    };

    fetch('https://kwai-kolors-kolors-virtual-try-on.hf.space/queue/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error: ' + response.status);
        }
        listenForResult(payload['session_hash'], currentPageUrl);
      })
      .catch((error) => {
        showError(
          'Could not do virtual try-on because kolors is busy,<br/> Please try again or use <a href="https://huggingface.co/spaces/Kwai-Kolors/Kolors-Virtual-Try-On" target="_blank">Huggingface space</a> directly.'
        );
        console.error('Error in virtual try-on process:', error);
      });
  }

  function listenForResult(eventId, currentPageUrl) {
    fetch(
      `https://kwai-kolors-kolors-virtual-try-on.hf.space/queue/data?session_hash=${eventId}`
    )
      .then((response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        reader.read().then(function processText({ done, value }) {
          if (done) {
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          let lines = buffer.split('\n');

          for (let i = 0; i < lines.length - 1; i++) {
            if (lines[i].startsWith('data:')) {
              const data = JSON.parse(lines[i].split('data: ')[1]);
              if (data['msg'] === 'process_completed') {
                if (data['success']) {
                  const resultUrl = data['output']['data'][0].url;
                  if (chrome.storage && chrome.storage.local) {
                    // Cache the result only if chrome.storage is available
                    const cacheData = {};
                    cacheData[currentPageUrl] = resultUrl; // Use current page URL as key
                    chrome.storage.local.set(cacheData, function () {
                      console.log('Result cached for', currentPageUrl);
                    });
                  }
                  displayResult(resultUrl);
                } else {
                  showError(
                    'Could not do virtual try-on because kolors is busy,<br/> Please try again or use <a href="https://huggingface.co/spaces/Kwai-Kolors/Kolors-Virtual-Try-On" target="_blank">Huggingface space</a> directly.'
                  );
                }
                return;
              }
            }
          }

          buffer = lines[lines.length - 1];
          reader.read().then(processText);
        });
      })
      .catch((error) => {
        showError('Error: ' + error.message);
        console.error('Error in virtual try-on process:', error);
      });
  }

  function loadLastResult() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentPageUrl = tabs[0].url; // Get the current page URL
      chrome.storage.local.get([currentPageUrl], function (result) {
        if (result[currentPageUrl]) {
          displayResult(result[currentPageUrl]);
        }
      });
    });
  }

  function displayResult(resultUrl) {
    loader.style.display = 'none';
    loadingMessage.style.display = 'none';
    const img = document.createElement('img');
    img.src = resultUrl;
    img.style.maxWidth = '100%';
    resultDiv.innerHTML = '';
    resultDiv.appendChild(img);
  }

  // chrome.storage.local.clear(function () {
  //   console.log('Storage cleared');
  // });
});
