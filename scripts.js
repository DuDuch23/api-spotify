document.addEventListener("DOMContentLoaded", () => {
    async function main() {
        const clientId = "f110319b3225469a93a5e12174ffae66";
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        console.log("token ", localStorage.getItem('token'))
        if(localStorage.getItem('token') != null){
            const profile = await fetchProfile(localStorage.getItem('token'));
            populateUI(profile);
            console.log("token 2 ", localStorage.getItem('token'), profile);
        } else if (!code) {
            redirectToAuthCodeFlow(clientId);
        } else {
            const accessToken = await getAccessToken(clientId, code);
            localStorage.setItem('token', accessToken)
            const profile = await fetchProfile(accessToken);
            populateUI(profile);
        }
    }

    main();

    async function CreationToken(code) {
        const clientId = "f110319b3225469a93a5e12174ffae66";
        const clientSecret = "dacb3e928ca2449187d9e1474af0390a";
        const createToken = "https://accounts.spotify.com/api/token";

        try {
            const response = await fetch(createToken, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
                },
                body: new URLSearchParams({
                    grant_type: "client_credentials",
                    code: code,
                    redirect_uri: "http://localhost:5500",
                }),
            });

            if (!response.ok) {
                throw new Error("Échec de l'obtention du token d'accès");
            }

            const data = await response.json();

            setTimeout(() => {
                const tokenExpired = document.getElementById("token-expired");
                if (tokenExpired) {
                    tokenExpired.innerHTML = `<p>Token expiré, veuillez recharger la page</p>`;
                }
            }, data.expires_in);

            console.log("Token d'accès reçu :", data.access_token);
            return data.access_token;
        } catch (error) {
            console.error("Erreur lors de la création du token :", error.message);
            throw error;
        }
    }

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
    
    function generateCodeVerifier(length) {
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
    
        const result = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params
        });
    
        const { access_token } = await result.json();
        console.log(access_token)
        return access_token;
    }
    
    async function fetchProfile(token) {
        const result = await fetch("https://api.spotify.com/v1/me", {
            method: "GET", headers: { Authorization: `Bearer ${token}` }
        });
    
        return await result.json();
    }
    
    function populateUI(profile) {
        document.getElementById("displayName").innerText = profile.display_name;
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