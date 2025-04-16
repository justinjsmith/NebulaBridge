import { Amplify, Auth } from 'aws-amplify';

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
    const user = await Auth.signIn(username, password);
    return { success: true, user };
  } catch (error) {
    console.error('Error signing in:', error);
    return { success: false, error };
  }
};

export const signUp = async (username, password, email) => {
  try {
    const { user } = await Auth.signUp({
      username,
      password,
      attributes: { email }
    });
    return { success: true, user };
  } catch (error) {
    console.error('Error signing up:', error);
    return { success: false, error };
  }
};

export const signOut = async () => {
  try {
    await Auth.signOut();
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error };
  }
};

export const getCurrentUser = async () => {
  try {
    const user = await Auth.currentAuthenticatedUser();
    return { success: true, user };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { success: false, error };
  }
};

export const getIdToken = async () => {
  try {
    const session = await Auth.currentSession();
    return session.getIdToken().getJwtToken();
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};
