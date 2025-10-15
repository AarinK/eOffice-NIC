  const crypto = require("crypto");

  const ENC_ALGO = "aes-256-gcm"; // secure modern cipher
  const ENC_SECRET = process.env.ENCRYPTION_SECRET; // must be 32 bytes
  if (!ENC_SECRET || ENC_SECRET.length < 32) {
    throw new Error("ENCRYPTION_SECRET must be 32 characters long (for AES-256-GCM)");
  }

  /**
   * Encrypt a given text (token or any string)
   */
  function encryptToken(plainText) {
    const iv = crypto.randomBytes(12); // GCM recommended IV length is 12 bytes
    const cipher = crypto.createCipheriv(ENC_ALGO, Buffer.from(ENC_SECRET), iv);

    let encrypted = cipher.update(plainText, "utf8", "base64");
    encrypted += cipher.final("base64");

    const authTag = cipher.getAuthTag();
    // Concatenate IV + ciphertext + authTag
    const encryptedPayload = Buffer.concat([
      iv,
      Buffer.from(encrypted, "base64"),
      authTag,
    ]).toString("base64");

    return encryptedPayload;
  }

  /**
   * Decrypt a previously encrypted text
   */
  function decryptToken(encryptedText) {
    // 👇 URL-decode first
    const decodedToken = decodeURIComponent(encryptedText);

    const rawData = Buffer.from(decodedToken, "base64");
    const iv = rawData.subarray(0, 12);
    const authTag = rawData.subarray(rawData.length - 16);
    const ciphertext = rawData.subarray(12, rawData.length - 16);

    const decipher = crypto.createDecipheriv(ENC_ALGO, Buffer.from(ENC_SECRET), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  // const ans=decryptToken("ySW5gE3vjwd4gXz%2Bs40Rz%2FRtPlA23J%2BNpnTODy%2FuUZMxM7o0IBQnWP4tn3MVA24uO8v2PDvc0QtAcXiH2%2F%2F5%2F2Q6SP9ibIW57mq82jzSOckOlYRpjyOF6fCz0rx4C8CGRlSB4zWSi0ePukb3wMTsHbBOwxrym0Q4ikbmRq0MW57lfqp4FeneX7s5kRQXZCulLfkSu4v2p0rwVzMuTFVUciZe16dtCyBUa6%2FlQTS%2BOki1tN%2BtYvHwauh4oRV3bCmhCvokZs%2B7FU6sUTU8ShZnlps%2F%2FjUPa4aWcyD7FdQbJuGKa6E4QKbTSGLcCtpL1gXpWjDmfBmw9PII00q8LqjR2qvoDP%2ForAf6OJYqVzh0hjN%2BeoMms%2FtPXuAJWn5aLtWjM%2FeTQAJG%2B2yTo90s85tuQcNAf%2BRKQIo5A5PAsdW7ZtMD4eq0bLi44noO%2BQMTl%2FB%2FHlvErWZnQmttimi9vTYf58wDDM6ZpV8tItBo5qnfohaTnc4xvCz%2FbRbQoGtEvLbFb1u1uLz67gFSrabRpr8SDHjRdOVde8PDucL%2FWnn257mwfuYamNa4wdSYvoQSp6WzIWoXG9WiVeBNE63UZ8oXaBn%2F4Rr8OrltRQq0ca%2BZhPIdtgsToSU0Ylb7btpDVLTGVT6HlaLwMYOkIp17uxVfDqFIS4T1NvS3flq4zrW9RH3BLBVXmY9iOPl1vS6kJ05xpq9HymPpCaEQIBZ9577BuhSDutRFKlgqFogQ04Aw0gwy1YDTR7V%2FNNfJ%2FDSrUVlS38XXL9BkaFuVVVzDcKku70eEXmayOtbXZb%2FhKRQxevtCQ5v9hI9cspvxVvS3kFp2HmiWEVwBeA%3D%3D");
  // console.log(ans)
  module.exports = { encryptToken, decryptToken };
