import { Strategy, VerifiedCallback } from 'passport-custom'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ExtractJwt } from 'passport-jwt'
import { Request } from 'express'
import * as firebaseAdmin from 'firebase-admin'
import { validateAdminTokenEmailPayload } from '../util'

@Injectable()
export class FirebaseAdminUserValidateStrategy extends PassportStrategy(
  Strategy,
  'firebase-admin-user-validate'
) {
  async validate(req: Request, done: VerifiedCallback): Promise<any> {
    const extractorFunction = ExtractJwt.fromAuthHeaderAsBearerToken()
    const token = extractorFunction(req)
    if (!token) {
      throw new UnauthorizedException('No bearer token found in the header')
    }

    let userDecodedToken: firebaseAdmin.auth.DecodedIdToken
    try {
      userDecodedToken = await firebaseAdmin.auth().verifyIdToken(token)
    } catch (error) {
      throw new UnauthorizedException(error.message)
    }

    // Expect all admin access tokens to have email and email_verified data.
    validateAdminTokenEmailPayload(userDecodedToken)

    // TODO @yashmurty : Check isAdminUser custom claim.
    console.log(userDecodedToken)

    done(null, userDecodedToken)
  }
}
