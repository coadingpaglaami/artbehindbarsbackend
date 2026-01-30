import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import fetch from 'node-fetch'; // or global fetch if Node 18+


console.log(process.env.GOOGLE_CALLBACK_URL)
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/user.birthday.read',
      ],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    let dateOfBirth: string | null = null;

    try {
      // Call Google People API to get birthdays
      const res = await fetch(
        'https://people.googleapis.com/v1/people/me?personFields=birthdays',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = (await res.json()) as any;

      if (data?.birthdays?.length) {
        // Find primary birthday
        const primaryBirthday = data.birthdays.find(
          (b: any) => b.metadata?.primary === true
        );

        const bday = primaryBirthday?.date;

        if (bday?.month && bday?.day) {
          if (bday.year && bday.year !== 2000) {
            // Valid full DOB
            dateOfBirth = `${bday.year}-${String(bday.month).padStart(
              2,
              '0',
            )}-${String(bday.day).padStart(2, '0')}`;
          } else {
            // Year missing — store partial as MM-DD
            dateOfBirth = `--${String(bday.month).padStart(2, '0')}-${String(
              bday.day,
            ).padStart(2, '0')}`;
          }
        }
      }
    } catch (err) {
      console.warn('Google birthday fetch failed', err);
      // Ignore if birthday not accessible
    }

    // Build user object
    const user = {
      email: profile?.emails?.[0]?.value ?? null,
      firstName: profile?.name?.givenName ?? null,
      lastName: profile?.name?.familyName ?? null,
      picture: profile?.photos?.[0]?.value ?? null,
      dateOfBirth, // real year or partial MM-DD
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
