const playerName = `${Math.floor(Math.random() * 1000)}`; // prompt('Name');
if (!playerName) {
  alert('You gotta give us a name!');
  window.location.reload();
}

firebase.initializeApp({
  apiKey: "AIzaSyBdAc7UVmUJFFRTyW7YQPrwmGnY9ubtRks",
  authDomain: "phasersandbox.firebaseapp.com",
  databaseURL: "https://phasersandbox.firebaseio.com",
  projectId: "phasersandbox",
  storageBucket: "phasersandbox.appspot.com",
  messagingSenderId: "886191655531",
  appId: "1:886191655531:web:a949bc5486d5761022bf2e",
  measurementId: "G-S7W0ZWX89N"
});

const database = firebase.database();
const playersRef = database.ref('players');
const playerRef = database.ref(`players/${playerName}`);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false,
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
});

let player;
let players;
let platforms;
let cursors;
let scoreText;
let gameOver;
let score = 0;
let connectionIds = [];

function preload () {
  this.load.image('sky', 'assets/sky.png');
  this.load.image('ground', 'assets/platform.png');
  this.load.image('star', 'assets/star.png');
  this.load.image('bomb', 'assets/bomb.png');
  this.load.spritesheet('dude', 
    'assets/dude.png', 
    { frameWidth: 32, frameHeight: 48 }
  );
};

function create () {
  this.add.image(400, 300, 'sky');
  platforms = this.physics.add.staticGroup();
  platforms.create(400, 568, 'ground').setScale(2).refreshBody();
  platforms.create(600, 400, 'ground');
  platforms.create(50, 250, 'ground');
  platforms.create(750, 220, 'ground');

  player = this.physics.add.sprite(100, 450, 'dude');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  playerNameText = this.add.text(
    player.body.position.x,
    player.body.position.y - 10,
    playerName, 
    { fontSize: '12px', fill: '#000'}
  );

  playerRef.set({
    name: playerName,
    x: 100,
    y: 450,
  });

  playersRef.on('value', handlePlayersDataChange);

  cursors = this.input.keyboard.createCursorKeys();
  // wasd
  // cursors = this.input.keyboard.addKeys({
  //   up:Phaser.Input.Keyboard.KeyCodes.W,
  //   down:Phaser.Input.Keyboard.KeyCodes.S,
  //   left:Phaser.Input.Keyboard.KeyCodes.A,
  //   right:Phaser.Input.Keyboard.KeyCodes.D
  // });
  
  this.anims.create({
    key: 'left',
    frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: 1,
  });

  this.anims.create({
    key: 'turn',
    frames: [ { key: 'dude', frame: 4 } ],
    frameRate: 20
  });

  this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1,
  });
  
  scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000'});

  stars = this.physics.add.group({
    key: 'star',
    repeat: 11,
    setXY: { x: 12, y: 0, stepX: 70 },
  });
  stars.children.iterate(child => child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8)));

  bombs = this.physics.add.group();
  players = this.physics.add.group();

  this.physics.add.collider(player, platforms);
  this.physics.add.collider(players, platforms);
  this.physics.add.collider(stars, platforms);
  this.physics.add.collider(bombs, platforms);
  this.physics.add.collider(player, bombs, hitBomb, null, this);
  this.physics.add.overlap(player, stars, collectStar, null, this);
};

function update () {
  if (player) {
    checkMovement();
  }
};

const checkMovement = () => {
  if (cursors.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('left', true);
    emitMove();
  } else if (cursors.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('right', true);
    emitMove();
  } else {
    player.setVelocityX(0);
    player.anims.play('turn');
  }
  if (cursors.up.isDown && player.body.touching.down) {
    player.setVelocityY(-350);
  }

  playerNameText.x = player.x;
  playerNameText.y = player.y - 10;
};

const emitMove = () => {
  try {
    playerRef.transaction(function(origPlayer) {
      const updatedPlayer = {
        ...origPlayer,
        x: player.x,
        y: player.y,
      };
      return updatedPlayer;
    });
  } catch(err) {
    console.log(err)
  }
}

const collectStar = (player, star) => {
  star.disableBody(true, true);
  score += 10;
  scoreText.setText(`Score ${score}`);
  if (stars.countActive(true) === 0) {
    console.log('test')
    stars.children.iterate(child => child.enableBody(true, child.x, 0, true, true));
    
  }
  const x = (player.x < 400)
      ? Phaser.Math.Between(400, 800)
      : Phaser.Math.Between(0, 400);
  const bomb = bombs.create(x, 16, 'bomb');
  bomb.setBounce(1);
  bomb.setCollideWorldBounds(true);
  bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
};

function hitBomb(player, bomb) {
  this.physics.pause();
  player.setTint(0xff0000);
  player.anims.play('turn');
  gameOver = true;
}

function createPlayer({ name, x, y}) {
  connectionIds.push(name);
  players.create(x, y, 'dude');
}

function checkEnemyForUpdates(data, i) {
  console.log(players.children(i))
  console.log('updating enemy', i)
}

const handlePlayersDataChange = snapshot => {
  console.log('data changing')

  Object.entries(snapshot.val())
    .forEach(([key, data], i) => {
      if (key !== playerName) {
        if (!connectionIds.includes(key)) {
          createPlayer(data);
        } else {
          checkEnemyForUpdates(data, i);
        }
      }
    });
}

playerRef.onDisconnect().remove();
