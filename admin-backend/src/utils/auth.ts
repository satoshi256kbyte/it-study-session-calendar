import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

const client = jwksClient({
  jwksUri: `https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_dmuU9NwBk/.well-known/jwks.json`,
})

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey()
    callback(null, signingKey)
  })
}

export const verifyToken = (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: '26g3glr57ifavspph5ongptg4k',
        issuer:
          'https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_dmuU9NwBk',
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          reject(err)
        } else {
          resolve(decoded)
        }
      }
    )
  })
}

export const extractTokenFromEvent = (event: any): string | null => {
  const authHeader =
    event.headers?.Authorization || event.headers?.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}
