function resizeImage(file, maxWidth) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scaleFactor = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleFactor;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: file.type }));
        }, file.type);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function getMimeTypeFromUrl(url) {
 
  const extension = url.split('.').pop().split('?')[0]; 
  switch (extension.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream'; 
  }
}

function uploadImgToHf(file) {
  const loadingMessage = document.getElementById('loadingMessage');
  if (loadingMessage) loadingMessage.textContent = 'Loading images...';

  const formData = new FormData();
  formData.append('files', file);

  return fetch(
    'https://kwai-kolors-kolors-virtual-try-on.hf.space/upload?upload_id=' +
      Math.random().toString(36).substring(2),
    {
      method: 'POST',
      body: formData,
    }
  )
    .then((response) => {
      if (!response.ok) throw new Error('Upload failed with status ' + response.status);
      return response.json();
    })
    .then((data) => {
      return data[0];
    })
    .catch((error) => {
      console.error('Error:', error);
      throw error;
    });
}

async function uploadProductImg(imageUrl) {
  return fetch(imageUrl)
    .then((response) => {
      if (!response.ok) throw new Error('Failed to fetch image');
      return response.blob();
    })
    .then((blob) => {
      const fileName = imageUrl.split('/').pop().split('?')[0] || 'image.jpg';
      const file = new File([blob], fileName, {
        type: getMimeTypeFromUrl(imageUrl),
      });

      return uploadImgToHf(file);
    })
    .catch((error) => {
      console.error('Error:', error);
      throw error;
    });
}
