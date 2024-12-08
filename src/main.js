import './style.css'
document.addEventListener("DOMContentLoaded", () => {
  async function main() {
      const clientId = "f110319b3225469a93a5e12174ffae66";
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const tokenExpirationKey = "token_expiration";

      if(localStorage.getItem('token') && !isTokenExpired()){
          console.log("token ", localStorage.getItem('token'))
          const profile = await fetchProfile(localStorage.getItem('token'));
          populateUI(profile);
      } else if (!code) {
          redirectToAuthCodeFlow(clientId);
      } else {
          const accessToken = await getAccessToken(clientId, code);
          const expirationTime = Date.now() + 3600 * 1000;
          localStorage.setItem('token', accessToken);
          localStorage.setItem(tokenExpirationKey, expirationTime);
          console.log("Token sauvegardé et expire à :", new Date(expirationTime));
          const profile = await fetchProfile(accessToken);
          populateUI(profile);

          setTimeout(() => {
              console.warn("Le token est expiré. Redirection...");
              redirectToAuthCodeFlow(clientId);
          }, 3600 * 1000);
      }
  }

  function isTokenExpired() {
      const expiration = localStorage.getItem("token_expiration");
      return !expiration || Date.now() > parseInt(expiration, 10);
  }

  main();

  async function redirectToAuthCodeFlow(clientId) {
      const verifier = generateCodeVerifier(128);
      const challenge = await generateCodeChallenge(verifier);
  
      localStorage.setItem("verifier", verifier);
  
      const params = new URLSearchParams();
      params.append("client_id", clientId);
      params.append("response_type", "code");
      params.append("redirect_uri", "http://localhost:5500");
      params.append("scope", "user-read-private user-read-email");
      params.append("code_challenge_method", "S256");
      params.append("code_challenge", challenge);
  
      document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }
  
  async function generateCodeVerifier(length) {
      let text = '';
      let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
      for (let i = 0; i < length; i++) {
          text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
  }
  
  async function generateCodeChallenge(codeVerifier) {
      const data = new TextEncoder().encode(codeVerifier);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
  }
  
  async function getAccessToken(clientId, code) {
      const verifier = localStorage.getItem("verifier");
  
      const params = new URLSearchParams();
      params.append("client_id", clientId);
      params.append("grant_type", "authorization_code");
      params.append("code", code);
      params.append("redirect_uri", "http://localhost:5500");
      params.append("code_verifier", verifier);
  
      try {
          const result = await fetch("https://accounts.spotify.com/api/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: params
          });
  
          if (!result.ok) {
              throw new Error(`Erreur HTTP : ${result.status}`);
          }
  
          const { access_token } = await result.json();
          return access_token;
      } catch (error) {
          console.error("Erreur lors de l'obtention du token :", error.message);
          return null;
      }
  }
  
  async function fetchProfile(token) {
      const result = await fetch("https://api.spotify.com/v1/me", {
          method: "GET", headers: { Authorization: `Bearer ${token}` }
      });
  
      return await result.json();
  }
  
  async function populateUI(profile) {
      document.getElementById("displayName").innerText = profile.display_name;
      if (profile.images[0]) {
          const profileImage = new Image(200, 200);
          profileImage.src = profile.images[0].url;
          document.getElementById("avatar").appendChild(profileImage);
          document.getElementById("imgUrl").innerText = profile.images[0].url;
      }
      document.getElementById("id").innerText = profile.id;
      document.getElementById("email").innerText = profile.email;
      document.getElementById("uri").innerText = profile.uri;
      document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
      document.getElementById("url").innerText = profile.href;
      document.getElementById("url").setAttribute("href", profile.href);
      if(profile.image && profile.images[0]){
          const profileImageUrl = profile.images[0].url;
          document.getElementById("imgUrl").innerText = profileImageUrl;
          console.log(profileImageUrl);
      }
      else{
          const pdpDefault = "cover2.png";
          document.getElementById("imgUrl").innerHTML = `
              <img src="${pdpDefault}">
          `;
          console.log(document.getElementById("imgUrl"));
      }
      console.log(profile);
  }
});