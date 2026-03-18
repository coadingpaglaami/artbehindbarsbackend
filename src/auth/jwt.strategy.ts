import { Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }
  async validate(payload: any) {
    return payload;
  }
}

// import { Injectable } from '@nestjs/common';
// import { ExtractJwt, Strategy } from 'passport-jwt';
// import { PassportStrategy } from '@nestjs/passport';

// // ✅ Extract from cookie
// const cookieExtractor = (req: any): string | null => {
//   if (req?.cookies?.accessToken) {
//     return req.cookies.accessToken;
//   }
//   return null;
// };

// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
//   constructor() {
//     const secret = process.env.JWT_SECRET;

//     if (!secret) {
//       throw new Error('JWT_SECRET is not defined');
//     }

//     super({
//       jwtFromRequest: ExtractJwt.fromExtractors([
//         cookieExtractor, // ✅ 1st priority (browser)
//         ExtractJwt.fromAuthHeaderAsBearerToken(), // ✅ fallback (Postman)
//       ]),
//       secretOrKey: secret,
//     });
//   }

//   async validate(payload: any) {
//     return payload;
//   }
// }
