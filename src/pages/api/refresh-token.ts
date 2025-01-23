import { Request, Response } from 'express';
import { db } from '../../services/firebase';
import { ref, get } from 'firebase/database';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { uid } = req.body;
  
  try {
    const userRef = ref(db, `users/${uid}/spotify`);
    const snapshot = await get(userRef);
    const refreshToken = snapshot.val()?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ message: 'No refresh token found' });
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ message: 'Failed to refresh token' });
  }
} 