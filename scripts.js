const clientId = "Changer avec son client id";
const params = new URLSearchParams(window.location.search);
const clientSecret = "Changer avec son client secret";
const redirectUri = "http://localhost:5500";
const code = params.get("code");

async function main() {
    let accessToken = localStorage.getItem("access_token");

    if (!accessToken && !code) {
        redirectToAuthCodeFlow(clientId);
        return;
    } 

    if (!accessToken && code) {
        accessToken = await fetchAccessToken(clientId, code);
        if (accessToken) {
            localStorage.setItem("access_token", accessToken);
        } else {
            console.error("Impossible de récupérer un token.");
            return;
        }
    }

    if (accessToken) {
        try {
            const profile = await getUserProfile(accessToken);
            if (profile) {
                const artists = await GetFollowedArtists(accessToken);
                populateUI(profile);
                if (artists) {
                    ShowArtists(artists);
                }
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données :", error);
        }
    }
}


async function ShowAll() {
    const profile = await getUserProfile(accessToken);
    if (profile) {
        const artists = await GetFollowedArtists(accessToken);
        populateUI(profile);
        if(artists){
            const playlists = await GetPlaylists(accessToken);
            GetFollowedArtists(accessToken);
            ShowArtists(artists);
            if(playlists){
                GetPlaylists(accessToken)
                return;
            }
        }
    }
}

async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", redirectUri);
    params.append("scope", "user-follow-read user-read-private user-read-email");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function fetchAccessToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("code_verifier", verifier);

    try {
        const result = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params.toString(),
        });

        if (!result.ok) {
            console.error("Error fetching access token:", result.status, await result.text());
            return null;
        }

        const { access_token } = await result.json();
        return access_token;
    } catch (error) {
        console.error("Error during fetchAccessToken:", error);
        return null;
    }
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
        console.error("No refresh token found in localStorage");
        return null;
    }
    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${btoa(clientId + ":" + clientSecret)}`,
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            }),
        });
    
        console.log(response);
    
        if (!response.ok) {
            console.error("Failed to refresh access token:", response.status, response.statusText);
            return null;
        }
    
        const data = await response.json();
        localStorage.setItem("access_token", data.access_token);
        if (data.refresh_token) {
            localStorage.setItem("refresh_token", data.refresh_token);
        }
        return data.access_token;
    } catch (error) {
        console.error("Error during fetch:", error);
        return null;
    }
}

async function getUserProfile(accessToken) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (result.status === 401) {
        console.warn("Access token expired. Attempting to refresh...");
        const newAccessToken = await refreshAccessToken();
        if (!newAccessToken) {
            console.error("Failed to refresh token. Reauthentication required.");
            redirectToAuthCodeFlow(clientId);
            return null;
        }
        return getUserProfile(newAccessToken);
    }

    if (!result.ok) {
        console.error("Failed to fetch user profile:", result.status, result.statusText);
        return null;
    }

    return await result.json();
}

function populateUI(profile) {
    if (!profile) {
        console.error("No profile data to display.");
        return;
    }

    document.getElementById("displayName").innerText = profile.display_name;
    const profileImage = new Image(200, 200);
    if (profile.images[0]) {
        profileImage.src = profile.images[0].url;
        document.getElementById("content-pdp").appendChild(profileImage);
    }
    else{
        console.log("pas image");
        imgDefault = "cover2.png";
        document.getElementById("content-pdp").innerHTML = `
            <img src="${imgDefault}">
        `;
    }
    document.getElementById("id").innerText = profile.id;
    document.getElementById("email").innerText = profile.email;
    document.getElementById("uri").innerText = profile.uri;
    document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url").innerText = profile.href;
    document.getElementById("url").setAttribute("href", profile.href);
}

// Récupération des artistes suivis
async function GetFollowedArtists(accessToken) {
    try {
        const response = await fetch("https://api.spotify.com/v1/me/following?type=artist", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            console.error("Erreur lors de la récupération des artistes suivis :", response.status, response.statusText);
            return null;
        }

        const data = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        console.error("Erreur lors de la requête :", error);
    }
}

// Affichage des artistes suivis
async function ShowArtists(data) {
    const artistList = document.getElementById("artistList");
    artistList.innerHTML = "";

    const artists = data.artists?.items;
    if (!artists || artists.length === 0) {
        artistList.innerHTML = "<p>Aucun artiste suivi trouvé.</p>";
        return;
    }

    artists.forEach((artist) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        const contentArtist = artistList.appendChild(li);
        const urlArtist = contentArtist.appendChild(a);

        const img = new Image(100, 100);
        img.src = artist.images[0]?.url || "default-image.jpg"; 
        img.alt = artist.name;
        urlArtist.appendChild(img);

        const name = document.createElement("span");
        name.textContent = artist.name;
        urlArtist.appendChild(name);

        urlArtist.href = artist.external_urls.spotify;
        urlArtist.target = "_blank";
    });
}

async function displayArtists(accessToken) {
    const data = await GetFollowedArtists(accessToken);

    if (data) {
        await ShowArtists(data);
    } else {
        console.error("Impossible de récupérer les artistes suivis.");
    }
}

async function searchAlbum(accessToken) {
    try {
        const response = await fetch("https://api.spotify.com/v1/search?type=album", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            console.error("Erreur lors de la recherche :", response.status, response.statusText);
            return null;
        }

        const data = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        console.error("Erreur lors de la requête :", error);
    }
}

main();