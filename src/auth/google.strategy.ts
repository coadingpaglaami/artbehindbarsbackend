import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

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
        // optional – may still return nothing
        'https://www.googleapis.com/auth/user.birthday.read',
      ],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos, birthdays } = profile;

    // DOB is optional
    let dateOfBirth: string | null = null;

    if (birthdays?.length) {
      const primaryBirthday = birthdays.find((b) => b.metadata?.primary);
      if (primaryBirthday?.date) {
        const { year, month, day } = primaryBirthday.date;
        if (year && month && day) {
          dateOfBirth = `${year}-${month
            .toString()
            .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
      }
    }

    const user = {
      email: emails?.[0]?.value ?? null,
      firstName: name?.givenName ?? null,
      lastName: name?.familyName ?? null,
      dateOfBirth, // usually null
      picture: photos?.[0]?.value ?? null,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
