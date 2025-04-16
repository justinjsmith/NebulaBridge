const fs = require('fs');
const { execSync } = require('child_process');

const getCdkOutputs = () => {
  try {
    const outputJson = execSync('cdk deploy --outputs-file /tmp/cdk-outputs.json', { 
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    
    const outputs = JSON.parse(fs.readFileSync('/tmp/cdk-outputs.json', 'utf-8'));
    return outputs.InfraStack;
  } catch (error) {
    console.error('Error getting CDK outputs:', error.message);
    return null;
  }
};

const updateFrontendEnv = (outputs) => {
  if (!outputs) {
    console.error('No CDK outputs available');
    return;
  }

  const envPath = '../frontend/.env';
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } catch (error) {
    console.error('Error reading .env file:', error.message);
    return;
  }

  const envVars = {
    'REACT_APP_API_URL': outputs.ApiUrl,
    'REACT_APP_AWS_REGION': 'us-east-1',
    'REACT_APP_USER_POOL_ID': outputs.UserPoolId,
    'REACT_APP_USER_POOL_CLIENT_ID': outputs.UserPoolClientId,
    'REACT_APP_COGNITO_DOMAIN': `nebulabridge-${process.env.AWS_ACCOUNT_ID || ''}`,
  };

  Object.entries(envVars).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  });

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('Frontend .env file updated with Cognito configuration');
  } catch (error) {
    console.error('Error writing .env file:', error.message);
  }
};

const main = async () => {
  console.log('Getting CDK outputs...');
  const outputs = getCdkOutputs();
  
  if (outputs) {
    console.log('Updating frontend .env file...');
    updateFrontendEnv(outputs);
  }
};

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
