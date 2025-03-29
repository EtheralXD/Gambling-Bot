require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder, 
    Events, 
    MessageFlags,
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    PermissionsBitField,
    EmbedBuilder
} = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const userDataPath = path.join(__dirname, 'data', 'users.json');

if (!fs.existsSync(path.dirname(userDataPath))) {
    fs.mkdirSync(path.dirname(userDataPath), { recursive: true });
}

function loadUserData() {
    try {
        return fs.existsSync(userDataPath) 
            ? JSON.parse(fs.readFileSync(userDataPath))
            : {};
    } catch (err) {
        console.error('Error loading user data:', err);
        return {};
    }
}

function saveUserData(data) {
    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
}

function getUser(userId) {
    const users = loadUserData();
    if (!users[userId]) {
        users[userId] = { 
            coins: 100,     
            username: '',           
        };
        saveUserData(users);
    }
    return users[userId];
}

function updateCoins(userId, amount) {
    const users = loadUserData();
    if (!users[userId]) users[userId] = { coins: 100, username: '' };
    users[userId].coins += amount;
    saveUserData(users);
    return users[userId].coins;
}

const slotSymbols = [
    { emoji: '🍒', value: 1, weight: 40 }, 
    { emoji: '🍋', value: 2, weight: 20 },
    { emoji: '🍊', value: 3, weight: 10 },
    { emoji: '🍇', value: 5, weight: 8 },
    { emoji: '💰', value: 10, weight: 3 },
    { emoji: '7️⃣', value: 15, weight: 2 }  
  ];

  const cardValues = [
    // Spades
    { emoji: '🂡', value: 1 },  // Ace
    { emoji: '🂢', value: 2 },
    { emoji: '🂣', value: 3 },
    { emoji: '🂤', value: 4 },
    { emoji: '🂥', value: 5 },
    { emoji: '🂦', value: 6 },
    { emoji: '🂧', value: 7 },
    { emoji: '🂨', value: 8 },
    { emoji: '🂩', value: 9 },
    { emoji: '🂪', value: 0 },  // 10
    { emoji: '🂫', value: 0 },  // Jack
    { emoji: '🂭', value: 0 },  // Queen
    { emoji: '🂮', value: 0 },  // King
    
    // Hearts
    { emoji: '🂱', value: 1 },  // Ace
    { emoji: '🂲', value: 2 },
    { emoji: '🂳', value: 3 },
    { emoji: '🂴', value: 4 },
    { emoji: '🂵', value: 5 },
    { emoji: '🂶', value: 6 },
    { emoji: '🂷', value: 7 },
    { emoji: '🂸', value: 8 },
    { emoji: '🂹', value: 9 },
    { emoji: '🂺', value: 0 },  // 10
    { emoji: '🂻', value: 0 },  // Jack
    { emoji: '🂽', value: 0 },  // Queen
    { emoji: '🂾', value: 0 },  // King
    
    // Diamonds
    { emoji: '🃁', value: 1 },  // Ace
    { emoji: '🃂', value: 2 },
    { emoji: '🃃', value: 3 },
    { emoji: '🃄', value: 4 },
    { emoji: '🃅', value: 5 },
    { emoji: '🃆', value: 6 },
    { emoji: '🃇', value: 7 },
    { emoji: '🃈', value: 8 },
    { emoji: '🃉', value: 9 },
    { emoji: '🃊', value: 0 },  // 10
    { emoji: '🃋', value: 0 },  // Jack
    { emoji: '🃍', value: 0 },  // Queen
    { emoji: '🃎', value: 0 },  // King
    
    // Clubs
    { emoji: '🃑', value: 1 },  // Ace
    { emoji: '🃒', value: 2 },
    { emoji: '🃓', value: 3 },
    { emoji: '🃔', value: 4 },
    { emoji: '🃕', value: 5 },
    { emoji: '🃖', value: 6 },
    { emoji: '🃗', value: 7 },
    { emoji: '🃘', value: 8 },
    { emoji: '🃙', value: 9 },
    { emoji: '🃚', value: 0 },  // 10
    { emoji: '🃛', value: 0 },  // Jack
    { emoji: '🃝', value: 0 },  // Queen
    { emoji: '🃞', value: 0 }   // King
];

function calculateBaccaratWin(cards, betAmount) {
    const playerValue = (cards[0].value + cards[1].value) % 10;
    const bankerValue = (cards[2].value + cards[3].value) % 10;
    
    if (playerValue > bankerValue) {
        return betAmount * 2; 
    } else if (bankerValue > playerValue) {
        return betAmount * 1.95; 
    }
    return betAmount * 8; 
}

function getRandomCard() {
    return cardValues[Math.floor(Math.random() * cardValues.length)];
}

  function getRandomSymbol() {
    const totalWeight = slotSymbols.reduce((sum, symbol) => sum + symbol.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const symbol of slotSymbols) {
      if (random < symbol.weight) return symbol;
      random -= symbol.weight;
    }
    
    return slotSymbols[0]; 
  }

  function calculateWin(spinResult, betAmount) {
    if (spinResult.every(val => val.emoji === spinResult[0].emoji)) {
      return betAmount * spinResult[0].value * 2;  
    }
    if (spinResult[0].emoji === spinResult[1].emoji && spinResult[0].value >= 3) {
      return betAmount * spinResult[0].value;
    }
    return 0;
  }

client.on(Events.InteractionCreate, async interaction => {

    // /casino thread
    if (interaction.isChatInputCommand() && interaction.commandName === 'casino') {
        if (interaction.channel.isThread()) {
            await interaction.reply({content: '❌ Your already in the casino', flags: MessageFlags.Ephemeral});
            return;
        }
        const thread = await interaction.channel.threads.create({
            name: `Casino`,
            autoArchiveDuration: 60,
            type: 12,
            invitable: true,
            reason: `User just waltzed into the casino`,
        });

        await thread.members.add(interaction.user.id);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('slots').setLabel('Slot\'s').setStyle(ButtonStyle.Primary).setEmoji('🎰'),
            new ButtonBuilder().setCustomId('tables').setLabel('Card Table\'s').setStyle(ButtonStyle.Primary).setEmoji('🃏'),
            new ButtonBuilder().setCustomId('wallet').setLabel('View Wallet').setStyle(ButtonStyle.Success).setEmoji('👝'),
        );
        
        await thread.send({content: `Welcome to the gamblers paradise, ${interaction.user.username}!`, components: [row]});
        await interaction.reply({ content: `The casino doors have been opened to you: ${thread}`, flags: MessageFlags.Ephemeral });
    }

    // Button interactions
    if (interaction.isButton()) {

        switch(interaction.customId) {
            case 'slots':
                try {

                    const embed = new EmbedBuilder()
                    .setTitle('🎰 Slot Machine 🎰')
                    .setDescription('Press the button below to spin the slots!')
                    .setColor('#FFD700');
                    
                    const spinButton = new ButtonBuilder()
                    .setCustomId('spin_slots')
                    .setLabel('SPIN! (Cost: 10 coins)')
                    .setStyle(ButtonStyle.Primary);

                    const row = new ActionRowBuilder().addComponents(spinButton);
    
                    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });

                } catch (err) {
                    console.error("Error handling slots button:", err);
                    await interaction.reply ({content: "This is not supposed to happen please try again later!", flags: MessageFlags.Ephemeral})
                }
                break;

            case 'spin_slots': 
             try {
                const user = getUser(interaction.user.id);
                user.username = interaction.user.username;
    
                const betAmount = 10;
    
                if (user.coins < betAmount) {
                    await interaction.reply({
                        content: `❌ You need at least ${betAmount} coins to spin!`,
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                const newBalance = updateCoins(interaction.user.id, -betAmount);
    
                const spinResult = [
                    getRandomSymbol(),
                    getRandomSymbol(),
                    getRandomSymbol()
                ];
    
                const winAmount = calculateWin(spinResult, betAmount);
    
                const resultEmbed = new EmbedBuilder()
                    .setTitle('🎰 Slot Machine Result 🎰')
                    .setDescription(`${spinResult[0].emoji} | ${spinResult[1].emoji} | ${spinResult[2].emoji}`)
                    .setColor(winAmount > 0 ? '#00FF00' : '#FF0000');
                
                if (winAmount > 0) {
                    updateCoins(interaction.user.id, winAmount);
                    resultEmbed.addFields(
                        { name: 'Result', value: `You won ${winAmount} coins!` }
                    );
                } else {
                    resultEmbed.addFields(
                        { name: 'Result', value: 'You lost! Try again!' }
                    );
                }
    
                const spinAgainButton = new ButtonBuilder()
                    .setCustomId('spin_slots')
                    .setLabel('SPIN AGAIN! (Cost: 10 coins)')
                    .setStyle(ButtonStyle.Primary);
                
                const row = new ActionRowBuilder().addComponents(spinAgainButton);
    
                await interaction.update({ 
                    embeds: [resultEmbed], 
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });
    
             } catch (error) {
                console.error('Error processing slot spin:', error);
                await interaction.reply({
                    content: '❌ There was an error processing your spin!',
                    flags: MessageFlags.Ephemeral
                });
             }
             break;

            case 'wallet':
                try {

                    const user = getUser(interaction.user.id);
                    user.username = interaction.user.username;

                    const walletEmbed = new EmbedBuilder()
                        .setTitle(`${interaction.user.username}'s Wallet`)
                        .setDescription(`Here's your current balance:`)
                        .setColor('#FFD700')
                        .addFields(
                            { name: 'Coins', value: `${user.coins}`, inline: true },
                        )
                        .setThumbnail(interaction.user.displayAvatarURL())
                        .setFooter({ text: 'Good luck gambling!' });

                    await interaction.reply({
                        embeds: [walletEmbed],
                        flags: MessageFlags.Ephemeral
                    });
                } catch (err) {
                    console.error("Error handling wallet button:", err);
                    await interaction.reply ({content: "This is not supposed to happen please try again later!", flags: MessageFlags.Ephemeral})
                }
                break;

            case 'tables':
                try {
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('baccarat').setLabel('Baccarat Table').setStyle(ButtonStyle.Danger),
                    );

                    await interaction.reply({content: `Welcome to the card tables. Try your luck of the draw! ${interaction.user.username}!`, components: [row], flags: MessageFlags.Ephemeral});

                } catch (err) {
                    console.error("Error handling tables button:", err);
                    await interaction.reply ({content: "This is not supposed to happen please try again later!", flags: MessageFlags.Ephemeral})
                }
                break;
            
            case 'baccarat':
                try {
                    
            
                    

                } catch (err) {
                    console.error("Error handling baccarat button:", err);
                    await interaction.reply ({content: "This is not supposed to happen please try again later!", flags: MessageFlags.Ephemeral})
                }
                break;
            
            
        }
    }
});

// Register Slash Commands
client.on('ready', async () => {
    const guild = client.guilds.cache.first();
    if (!guild) return console.error("❌ No guilds found.");

    await guild.commands.set([
        new SlashCommandBuilder().setName('casino').setDescription('Are you ready to go all in on black?'),
       
    ]);

    console.log(`🚀 Logged in as ${client.user.tag}`);
    console.log(`✅ /commands registered`);
});


client.login(process.env.TOKEN);