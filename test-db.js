const { Client } = require('pg');

const passwords = ['postgres', 'root', 'admin', 'password', '1234', '12345', '123456', ''];

async function testPasswords() {
  for (const pwd of passwords) {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: pwd,
      database: 'postgres',
    });

    try {
      await client.connect();
      console.log(`SUCCESS: Password is '${pwd}'`);
      await client.end();
      return pwd;
    } catch (err) {
      // console.log(`FAILED: '${pwd}' - ${err.message}`);
    }
  }
  console.log('FAIL: None of the common passwords worked.');
}

testPasswords();
