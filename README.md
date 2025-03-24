

# DDFH - DumDum File Hosting

**DDFH** is a cutting-edge encrypted file hosting platform that combines robust security with community interaction. Designed to protect your sensitive data, DDFH uses state-of-the-art encryption and a zero-knowledge architecture to ensure that only you can access your files.

## Key Features

### **Advanced Encryption & Zero-Knowledge Storage**
- **AES-GCM Encryption:** Files are encrypted on the client-side before upload, ensuring that only encrypted data is stored.
- **Zero-Knowledge Infrastructure:** Our system never sees unencrypted content—only file metadata is stored in our PostgreSQL database.
- **Secure File Sharing:** Users receive a shareable file link along with a decryption key and a unique panel key for file management. We will NEVER store your decryption keys
- **Panel:** On top of your decryption key a panel key is generated for you to verify your access to that post as well as monitoring your post, here you can prematurely delete such the post, all records from our db and storage.

### **User Security & Privacy**
- **Anonymous Uploads:** Upload files without requiring personal details, ensuring your privacy is maintained.
- **JWT-Based Authentication:** Our session management is powered by JSON Web Tokens, providing secure, stateless authentication.

### **Robust Forum & Marketplace**
- **Secure Forum:** Engage with a community in our secure forum where only authorized users (e.g., admins) can create threads.
- **Marketplace Integration:** List and manage encrypted files in a marketplace setting. Marketplace posts include file metadata, shareable links, and verification panel keys.
- **Content Ownership:** Users can delete or update their own posts, ensuring complete control over personal content.


