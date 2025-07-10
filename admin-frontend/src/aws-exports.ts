const awsconfig = {
  Auth: {
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1',
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
    userPoolWebClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
    oauth: {
      domain: process.env.NEXT_PUBLIC_USER_POOL_DOMAIN || '',
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN || 'http://localhost:3001/',
      redirectSignOut: process.env.NEXT_PUBLIC_REDIRECT_SIGN_OUT || 'http://localhost:3001/',
      responseType: 'code'
    }
  }
}

export default awsconfig
