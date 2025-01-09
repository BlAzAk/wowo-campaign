# WOWO Campaign

# Installation
```npm install```

# Configuration
- Step 1 : Edit ```config/keys.js``` with your sending address private key
- Step 2 : Edit ```config/variables.js``` with your sending address
- Step 3 : Edit ```.env``` with your MySQL credentials (create a new database)
- Step 4 : Launch ```npx prisma migrate dev --name init``` to init the database structure
- Step 5 : Insert exported data to your new database
  - 1st : ```data/wowoWave.sql```
  - 2nd : ```data/wowoUser.sql```
  - 3rd : ```data/wowoReward.sql```

# Run
```node index.js```

OR

```nodemon index.js``` too keep the process detached from the console

OR

```pm2 index.js``` too keep the process live and relaunched if crashed (need pm2 package)