"use client";
//auth/github/page.tsx
import { useEffect, useState } from "react";
import axios from "axios";

export default function GitHubAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      axios
        .get(
          `https://code-myth.vercel.app/api/py/auth/github/callback?code=${code}`
        )
        .then((response) => {
          setUser(response.data.user);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Authentication failed:", error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return <p>Authenticating...</p>;
  if (!user) return <p>Authentication failed</p>;

  return (
    <div>
      <h1>Welcome, {user.login}!</h1>
      <img src={user.avatar_url} alt="GitHub Avatar" width={100} />
    </div>
  );
}
