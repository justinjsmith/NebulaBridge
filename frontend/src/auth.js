import { Amplify } from 'aws-amplify';
import { signIn as amplifySignIn, signUp as amplifySignUp, signOut as amplifySignOut, getCurrentUser as amplifyGetCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

export const configureAmplify = (config) => {
  Amplify.configure({
    Auth: {
      region: config.region,
      userPoolId: config.userPoolId,
      userPoolWebClientId: config.userPoolClientId,
      oauth: {
        domain: `${config.cognitoDomain}.auth.${config.region}.amazoncognito.com`,
        scope: ['email', 'profile', 'openid'],
        redirectSignIn: config.redirectSignIn,
        redirectSignOut: config.redirectSignOut,
        responseType: 'code'
      }
    }
  });
};

export const signIn = async (username, password) => {
  try {
    const { isSignedIn, nextStep } = await amplifySignIn({ username, password });
    if (isSignedIn) {
      const user = await amplifyGetCurrentUser();
      return { success: true, user };
    }
    return { success: false, nextStep };
  } catch (error) {
    console.error('Error signing in:', error);
    return { success: false, error };
  }
};

export const signUp = async (username, password, email) => {
  try {
    const { isSignUpComplete, userId, nextStep } = await amplifySignUp({
      username,
      password,
      options: {
        userAttributes: { email }
      }
    });
    return { success: isSignUpComplete, user: { username, userId }, nextStep };
  } catch (error) {
    console.error('Error signing up:', error);
    return { success: false, error };
  }
};

export const signOut = async () => {
  try {
    await amplifySignOut();
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error };
  }
};

export const getCurrentUser = async () => {
  try {
    const user = await amplifyGetCurrentUser();
    return { success: true, user };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { success: false, error };
  }
};

export const getIdToken = async () => {
  try {
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};
