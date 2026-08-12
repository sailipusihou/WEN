const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/site.db');

const columns = ['chatType', 'fromStaffId', 'toStaffId', 'fromAvatar', 'fromName', 'toAvatar', 'toName', 'orderRef'];
let count = 0;

columns.forEach(col => {
  db.run(`ALTER TABLE messages ADD COLUMN ${col} TEXT`, (err) => {
    if (err) {
      console.log(`Column ${col}: ${err.message}`);
    } else {
      console.log(`Added column: ${col}`);
    }
    count++;
    if (count === columns.length) {
      db.close();
      console.log('Done');
    }
  });
});
