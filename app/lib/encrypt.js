// cryptoUtils.js (if you want to separate into a module) 
export async function generateAESKey() {
    return await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }
  
  export async function encryptData(key, data) {
    let dataToEncrypt;
    if (typeof data === "string") {
      const encoder = new TextEncoder();
      dataToEncrypt = encoder.encode(data);
    } else if (data instanceof ArrayBuffer) {
      dataToEncrypt = new Uint8Array(data);
    } else {
      throw new Error("Unsupported data type for encryption");
    }
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      dataToEncrypt
    );
    return { ciphertext, iv };
  }
  
  
  export async function decryptData(key, ciphertext, iv) {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }
  export async function exportKey(key) {
    const rawKey = await window.crypto.subtle.exportKey("raw", key);
    const keyArray = Array.from(new Uint8Array(rawKey));
    return keyArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  export async function importKey(rawKeyHex) {
    // Convert hex string to Uint8Array
    const rawKey = new Uint8Array(
      rawKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );
    return await window.crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM" },
      true,
      ["decrypt"]
    );
  }
  
export async function generatePanelKey(length = 32) {
  // Create a random string of the specified length (hex)
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}


  