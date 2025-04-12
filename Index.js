const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');

const config = {
  SERVER_IMAGE: 'https://i.postimg.cc/7ZgZqQYB/SGRP.png',
  STATUS_PING_ROLE_ID: '1359257032313536674',
  DISCORD_TOKEN: 'MTM1ODQwNTkwMTIyNDEyMDQyMA.GgB5T4.IS0K4SolFS-nwFxoxFo-1uhznmf2jfC7ye7ifo',
  CHANNEL_ID: '1358418023396016202',
  ADMIN_IDS: ['691562874367377468', '1188594880256168089', '1324122602310074462'],
  ALLOWED_ROLES: ['= INHABER =', 'Stv. Inhaber', 'Projektleitung'],
  SERVER_NAME: 'Seattle RP GERMAN',
  SERVER_CODE: 'AAafz',
  TICKET_CHANNEL_ID: '1358447809249935371',
  TICKET_CATEGORY_ID: '1358447756209029217',
  TEAM_ROLE: '1358203388306657360',
  SELF_ROLE_CHANNEL: '1359265682310828333',
  ALLOWED_ROLES: ['= INHABER =', 'Stv. Inhaber', 'Projektleitung'],
  LOG_CHANNEL_ID: '1359270691928805376',
  SUGGESTION_CHANNEL_ID: '1360542256741744671',
  BOT_NAME: 'Seattle RP Bot',
  SELF_ROLES: {
    '🚦': '1359257032313536674',
    '📣': '1359267934018474286',
    '💻': '1359267949839388806',
    '📝': '1359267953484365906'
  }
};

let selfRoleMessage = null;
let logChannel = null;
let suggestions = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ]
});

async function sendSuggestionEmbed(user, content, suggestionNumber) {
  const channel = await client.channels.fetch(config.SUGGESTION_CHANNEL_ID);
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle(`${config.SERVER_NAME} | Only DC | Only German`)
    .setDescription(
      `💡 **Neuer Vorschlag #${suggestionNumber}**\n` +
      `\`\`\`\n${suggestionNumber}. ${content}\n\`\`\`\n` +
      `Von ${user}\n\n` +
      `**Abstimmungsergebnisse**\n` +
      `Dafür: 0 • Dagegen: 0\n` +
      `\`[${' '.repeat(10)}]\`\n` +
      `${config.BOT_NAME}`
    )
    .setColor(0x7289DA);

  const actionRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('accept_suggestion')
      .setLabel('Akzeptieren')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('reject_suggestion')
      .setLabel('Ablehnen')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('reset_votes')
      .setLabel('Stimmen zurücksetzen')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🗑️')
  );

  const actionRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('vote_yes')
      .setLabel('Dafür')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId('vote_no')
      .setLabel('Dagegen')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
  );

  const message = await channel.send({
    embeds: [embed],
    components: [actionRow1, actionRow2]
  });

  suggestions.set(message.id, {
    yes: 0,
    no: 0,
    authorId: user.id,
    content: content,
    number: suggestionNumber
  });
}

async function updateSuggestionEmbed(message, suggestion) {
  const total = suggestion.yes + suggestion.no;
  const progress = total === 0 ? 0.5 : suggestion.yes / total;
  const progressBar = '█'.repeat(Math.round(progress * 10)) + ' '.repeat(10 - Math.round(progress * 10));

  const embed = new EmbedBuilder()
    .setTitle(`${config.SERVER_NAME} | Only DC | Only German`)
    .setDescription(
      `💡 **Neuer Vorschlag #${suggestion.number}**\n` +
      `\`\`\`\n${suggestion.number}. ${suggestion.content}\n\`\`\`\n` +
      `Von <@${suggestion.authorId}>\n\n` +
      `**Abstimmungsergebnisse**\n` +
      `Dafür: ${suggestion.yes} • Dagegen: ${suggestion.no}\n` +
      `\`[${progressBar}]\`\n` +
      `${config.BOT_NAME}`
    )
    .setColor(
      suggestion.status === 'accepted' ? 0x00FF00 :
      suggestion.status === 'rejected' ? 0xFF0000 : 0x7289DA
    );

  await message.edit({ embeds: [embed] });
  suggestions.set(message.id, suggestion);
}

function setupConsoleLogging(channel) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  const sendToChannel = (method, ...args) => {
    const timestamp = new Date().toLocaleString('de-DE');
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ').slice(0, 2000);

    const logEmbed = new EmbedBuilder()
      .setColor(getLogColor(method))
      .setDescription(`\`[${timestamp}]\` **${method.toUpperCase()}**\n\`\`\`\n${message}\n\`\`\``)
      .setFooter({ text: `Systemlog • ${config.SERVER_NAME}` });

    channel.send({ embeds: [logEmbed] }).catch(() => {});
  };

  const getLogColor = (method) => {
    const colors = {
      error: 0xFF0000,
      warn: 0xFFA500,
      info: 0x00FF00,
      debug: 0x7289DA,
      log: 0x2F3136
    };
    return colors[method.toLowerCase()] || 0x2F3136;
  };

  console.log = (...args) => {
    sendToChannel('log', ...args);
    originalLog.apply(console, args);
  };

  console.error = (...args) => {
    sendToChannel('error', ...args);
    originalError.apply(console, args);
  };

  console.warn = (...args) => {
    sendToChannel('warn', ...args);
    originalWarn.apply(console, args);
  };

  console.info = (...args) => {
    sendToChannel('info', ...args);
    originalInfo.apply(console, args);
  };

  console.debug = (...args) => {
    sendToChannel('debug', ...args);
    originalDebug.apply(console, args);
  };
}

async function createTicketMenu() {
  const channel = await client.channels.fetch(config.TICKET_CHANNEL_ID);
  if (!channel?.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 10 });
  await channel.bulkDelete(messages);

  const embed = new EmbedBuilder()
    .setTitle('🎫 Ticket System')
    .setDescription('Wähle den gewünschten Ticket-Typ aus:')
    .setColor(0x00AEFF);

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_type')
      .setPlaceholder('Ticket-Typ auswählen')
      .addOptions(
        { label: 'Discord Support', value: 'dc', emoji: '🎮' },
        { label: 'In-Game Support', value: 'ic', emoji: '🖥️' },
        { label: 'Fraktionen', value: 'frak', emoji: '🎖️' },
        { label: 'Leitungs-Ticket', value: 'leitung', emoji: '👑' }
      )
  );

  await channel.send({ embeds: [embed], components: [menu] });
}

async function createTicket(interaction, type) {
  await interaction.deferReply({ ephemeral: true });
  
  const category = await client.channels.fetch(config.TICKET_CATEGORY_ID);
  const member = interaction.member;
  const ticketType = type.toUpperCase();
  
  // Check for Leitung role
  const leitungRole = interaction.guild.roles.cache.get('1360583463710883940');
  if (type === 'leitung' && !leitungRole) {
    console.error('❌ Leitungs-Rolle nicht gefunden!');
    return interaction.editReply({
      content: '❌ Interner Fehler: Leitungs-Rolle existiert nicht'
    });
  }

  const teamRole = interaction.guild.roles.cache.get(config.TEAM_ROLE);
  if (!teamRole && type !== 'leitung') {
    console.error('❌ Team-Rolle nicht gefunden!');
    return interaction.editReply({
      content: '❌ Interner Fehler: Team-Rolle existiert nicht'
    });
  }

  // Generate channel name
  const channelName = type === 'leitung' 
    ? `leitung-${member.user.username}`.toLowerCase()
    : type === 'frak' 
      ? `frak-${member.user.username}`.toLowerCase()
      : `${ticketType}-${member.user.username}`.toLowerCase();

  // Check for existing channel
  const existingChannel = interaction.guild.channels.cache.find(ch => 
    ch.parentId === config.TICKET_CATEGORY_ID &&
    ch.name.toLowerCase() === channelName
  );

  if (existingChannel) {
    return interaction.editReply({
      content: `❌ Du hast bereits ein offenes Ticket: ${existingChannel}`
    });
  }

  // Set permissions
  const permissionOverwrites = [
    { 
      id: interaction.guild.id, 
      deny: [PermissionFlagsBits.ViewChannel] 
    },
    { 
      id: member.id, 
      allow: [PermissionFlagsBits.ViewChannel] 
    },
    {
      id: type === 'leitung' 
        ? leitungRole.id 
        : teamRole.id,
      allow: [PermissionFlagsBits.ViewChannel] 
    }
  ];

  // Create channel
  const channel = await category.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.TICKET_CATEGORY_ID,
    permissionOverwrites: permissionOverwrites
  });

  // Create embed description
  const description = type === 'leitung'
    ? `🔐 **Leitungs-Internes Ticket**\n\n${member}, dieses Ticket ist ausschließlich für die Serverleitung sichtbar.`
    : type === 'frak' 
      ? `Willkommen im Fraktionen-Ticket, ${member}!\n\nBitte beschreibe dein Anliegen bezüglich Fraktionsangelegenheiten.`
      : `Willkommen im ${ticketType}-Support, ${member}!\n\nBitte beschreibe dein Anliegen so detailliert wie möglich.`;

  // Create embed
  const embed = new EmbedBuilder()
    .setTitle(`🎫 ${type === 'leitung' ? 'Leitung' : type === 'frak' ? 'Fraktionen' : ticketType}`)
    .setDescription(description)
    .addFields(
      { name: 'Erstellt von', value: member.user.tag },
      { name: 'Typ', value: type === 'leitung' ? 'Leitung' : type === 'frak' ? 'Fraktionen' : ticketType }
    )
    .setColor(type === 'leitung' ? 0xFFD700 : 0x00AEFF);

  // Buttons
  const buttonsRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Schließen')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('reopen_ticket')
      .setLabel('Wieder öffnen')
      .setStyle(ButtonStyle.Success)
  );

  const buttonsRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('delete_ticket')
      .setLabel('🗑️ Ticket löschen')
      .setStyle(ButtonStyle.Secondary)
  );

  // Send message
  await channel.send({
    content: type === 'leitung' ? `${leitungRole}` : `${teamRole}`,
    embeds: [embed],
    components: [buttonsRow1, buttonsRow2]
  });

  await interaction.editReply({
    content: `✅ Ticket erstellt: ${channel}`
  });
}



async function createTicket(interaction, type) {
  await interaction.deferReply({ ephemeral: true });
  
  const category = await client.channels.fetch(config.TICKET_CATEGORY_ID);
  const member = interaction.member;
  const ticketType = type.toUpperCase();
  
  const teamRole = interaction.guild.roles.cache.get(config.TEAM_ROLE);
  if (!teamRole) {
    console.error('❌ Team-Rolle nicht gefunden!');
    return interaction.editReply({
      content: '❌ Interner Fehler: Team-Rolle existiert nicht'
    });
  }

  const channelName = type === 'frak' 
    ? `Frak-${member.user.username}`.toLowerCase()
    : `${ticketType}-${member.user.username}`.toLowerCase();

  const existingChannel = interaction.guild.channels.cache.find(ch => 
    ch.parentId === config.TICKET_CATEGORY_ID &&
    ch.name.toLowerCase() === channelName
  );

  if (existingChannel) {
    return interaction.editReply({
      content: `❌ Du hast bereits ein offenes Ticket: ${existingChannel}`
    });
  }

  const channel = await category.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.TICKET_CATEGORY_ID,
    permissionOverwrites: [
      { 
        id: interaction.guild.id, 
        deny: [PermissionFlagsBits.ViewChannel] 
      },
      { 
        id: member.id, 
        allow: [PermissionFlagsBits.ViewChannel] 
      },
      { 
        id: teamRole.id,
        allow: [PermissionFlagsBits.ViewChannel] 
      }
    ]
  });

  const description = type === 'frak' 
    ? `Willkommen im Fraktionen-Ticket, ${member}!\n\nBitte beschreibe dein Anliegen bezüglich Fraktionsangelegenheiten.`
    : `Willkommen im ${ticketType}-Support, ${member}!\n\nBitte beschreibe dein Anliegen so detailliert wie möglich.`;

  const embed = new EmbedBuilder()
    .setTitle(`🎫 ${type === 'frak' ? 'Fraktionen' : ticketType}`)
    .setDescription(description)
    .addFields(
      { name: 'Erstellt von', value: member.user.tag },
      { name: 'Typ', value: type === 'frak' ? 'Fraktionen' : ticketType }
    )
    .setColor(0x00AEFF);

  const buttonsRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Schließen')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('reopen_ticket')
      .setLabel('Wieder öffnen')
      .setStyle(ButtonStyle.Success)
  );

  const buttonsRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('delete_ticket')
      .setLabel('🗑️ Ticket löschen')
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    content: `${teamRole}`,
    embeds: [embed],
    components: [buttonsRow1, buttonsRow2]
  });

  await interaction.editReply({
    content: `✅ Ticket erstellt: ${channel}`
  });
}

async function sendSelfRoleMenu() {
  try {
    const channel = await client.channels.fetch(config.SELF_ROLE_CHANNEL);
    if (!channel?.isTextBased()) return;

    const messages = await channel.messages.fetch({ limit: 10 });
    await Promise.all(messages.filter(m => m.author.id === client.user.id).map(m => m.delete()));

    const embed = new EmbedBuilder()
      .setTitle('🔔 Selbstverwaltete Rollen')
      .setColor(0x00AEFF)
      .setDescription(
        '**Wähle deine Benachrichtigungen:**\n\n' +
        '🚦 **Status Ping (RP Start)** - Erhalte Ping bei Serverstart\n' +
        '📣 **Informationen Ping** - Wichtige Serverankündigungen\n' +
        '💻 **Changelogs Ping** - Updates & Änderungen\n' +
        '📝 **Bewerbungs Ping** - Neue Bewerbungsphasen\n\n' +
        '**Anleitung:**\n' +
        '➥ Klicke auf das Emoji unter dieser Nachricht\n' +
        '➥ Zum Entfernen der Rolle einfach das Emoji entfernen\n' +
        '➥ Mehrfachauswahl möglich'
      )
      .setFooter({ text: config.SERVER_NAME })
      .setThumbnail(config.SERVER_IMAGE);

    selfRoleMessage = await channel.send({ embeds: [embed] });
    
    for (const emoji of Object.keys(config.SELF_ROLES)) {
      await selfRoleMessage.react(emoji);
    }
  } catch (error) {
    console.error('Fehler beim Self-Role-Setup:', error);
  }
}

client.once('ready', async () => {
  console.log(`✅ Bot eingeloggt als ${client.user.tag}`);
  
  try {
    logChannel = await client.channels.fetch(config.LOG_CHANNEL_ID);
    if (logChannel?.isTextBased()) {
      setupConsoleLogging(logChannel);
      console.log(`📨 Konsolenlogs aktiv für #${logChannel.name}`);
    }
  } catch (error) {
    console.error('Log-Channel Fehler:', error);
  }

  await createTicketMenu();
  await sendSelfRoleMenu();
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_type') {
    await createTicket(interaction, interaction.values[0]);
    return;
  }

  if (!interaction.isButton()) return;

  // Handle suggestion buttons
  const messageId = interaction.message.id;
  const suggestion = suggestions.get(messageId);

  if (['vote_yes', 'vote_no'].includes(interaction.customId)) {
    if (!suggestion) return;

    const hasVoted = interaction.message.components[1].components
      .some(btn => btn.customId === interaction.customId && btn.style === ButtonStyle.Success);

    if (hasVoted) {
      return interaction.reply({
        content: '❌ Du hast bereits abgestimmt!',
        ephemeral: true
      });
    }

    if (interaction.customId === 'vote_yes') suggestion.yes++;
    else suggestion.no++;

    await updateSuggestionEmbed(interaction.message, suggestion);
    await interaction.deferUpdate();
    return;
  }

  if (['accept_suggestion', 'reject_suggestion', 'reset_votes'].includes(interaction.customId)) {
    const member = interaction.member;
    const hasPermission = member.roles.cache.some(role => config.ALLOWED_ROLES.includes(role.name)) || 
                          config.ADMIN_IDS.includes(interaction.user.id);

    if (!hasPermission) {
      return interaction.reply({
        content: '❌ Nur berechtigte Personen können diese Aktion ausführen!',
        ephemeral: true
      });
    }

    switch (interaction.customId) {
      case 'accept_suggestion':
        suggestion.status = 'accepted';
        break;
      case 'reject_suggestion':
        suggestion.status = 'rejected';
        break;
      case 'reset_votes':
        suggestion.yes = 0;
        suggestion.no = 0;
        break;
    }

    await updateSuggestionEmbed(interaction.message, suggestion);
    await interaction.deferUpdate();
    return;
  }

  // Handle ticket buttons
  const member = interaction.member;
  const teamRole = interaction.guild.roles.cache.get(config.TEAM_ROLE);

  if (!teamRole || !member.roles.cache.has(teamRole.id)) {
    return interaction.reply({
      content: '❌ Nur Team-Mitglieder können Tickets verwalten!',
      ephemeral: true
    });
  }

  switch (interaction.customId) {
    case 'close_ticket':
      await interaction.channel.setName(`geschlossen-${interaction.channel.name}`);
      await interaction.channel.permissionOverwrites.set([
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: teamRole.id, allow: [PermissionFlagsBits.ViewChannel] }
      ]);

      const closedButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('reopen_ticket')
          .setLabel('Wieder öffnen')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('delete_ticket')
          .setLabel('🗑️ Ticket löschen')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({
        content: '🔒 Ticket wurde geschlossen',
        components: [closedButtons]
      });
      break;

    case 'reopen_ticket':
      await interaction.channel.setName(
        interaction.channel.name.replace('geschlossen-', '')
      );
      await interaction.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true
      });

      const reopenButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Schließen')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('reopen_ticket')
          .setLabel('Wieder öffnen')
          .setStyle(ButtonStyle.Success)
      );

      const deleteButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('delete_ticket')
          .setLabel('🗑️ Ticket löschen')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({
        content: '🔓 Ticket wurde wieder geöffnet',
        components: [reopenButtons, deleteButton]
      });
      break;

    case 'delete_ticket':
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('⚠️ Sicherheitsabfrage')
        .setDescription('Möchtest du das Ticket wirklich löschen?\nDiese Aktion kann nicht rückgängig gemacht werden!');

      const confirmButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_delete')
          .setLabel('✅ Ja, löschen')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_delete')
          .setLabel('❌ Abbrechen')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({ components: [] });

      const confirmMessage = await interaction.followUp({
        embeds: [confirmEmbed],
        components: [confirmButtons],
        ephemeral: true
      });

      const filter = i => i.user.id === interaction.user.id;
      const collector = confirmMessage.createMessageComponentCollector({ 
        filter,
        time: 15000
      });

      collector.on('collect', async i => {
        if (i.customId === 'confirm_delete') {
          await i.deferUpdate();
          
          const countdownEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setDescription('🕒 Ticket wird in 5 Sekunden gelöscht...');
          
          await i.editReply({
            embeds: [countdownEmbed],
            components: []
          });

          setTimeout(async () => {
            try {
              await interaction.channel.delete();
            } catch (error) {
              console.error('Fehler beim Löschen:', error);
            }
          }, 5000);

        } else if (i.customId === 'cancel_delete') {
          await i.update({
            content: '❌ Löschvorgang abgebrochen',
            embeds: [],
            components: []
          });
          collector.stop();
        }
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          interaction.editReply({
            content: '⏳ Zeit für die Bestätigung abgelaufen',
            components: []
          });
        }
      });
      break;
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.message.id !== selfRoleMessage?.id) return;

  const emoji = reaction.emoji.name;
  const roleId = config.SELF_ROLES[emoji];
  
  try {
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);
    const role = await guild.roles.fetch(roleId);

    if (role) {
      await member.roles.add(role);
      console.log(`➕ Rolle ${role.name} hinzugefügt für ${user.tag}`);
    }
  } catch (error) {
    console.error(`Fehler beim Hinzufügen der Rolle für ${user.tag}:`, error);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.message.id !== selfRoleMessage?.id) return;

  const emoji = reaction.emoji.name;
  const roleId = config.SELF_ROLES[emoji];
  
  try {
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);
    const role = await guild.roles.fetch(roleId);

    if (role) {
      await member.roles.remove(role);
      console.log(`➖ Rolle ${role.name} entfernt für ${user.tag}`);
    }
  } catch (error) {
    console.error(`Fehler beim Entfernen der Rolle für ${user.tag}:`, error);
  }
});

client.on('messageCreate', async (message) => {
  // This is the problematic part that was fixed
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Handle suggestions
    if (message.content.startsWith('!vorschlag ')) {
      const content = message.content.slice(11);
      const suggestionNumber = suggestions.size + 1;
      
      await message.delete().catch(() => {});
      await sendSuggestionEmbed(message.author, content, suggestionNumber);
      return;
    }

    // Handle commands
    const member = await message.guild.members.fetch(message.author.id);
    const hasPermission = member.roles.cache.some(role => config.ALLOWED_ROLES.includes(role.name)) || 
                          config.ADMIN_IDS.includes(message.author.id);

    if (!hasPermission) {
      const warningMessage = `❌ **Unberechtigter Zugriff**\n` +
        `**Benutzer:** ${message.author.tag} (${message.author.id})\n` +
        `**Befehl:** ${message.content}\n` +
        `**Channel:** ${message.channel.name}\n` +
        `**Zeitpunkt:** ${new Date().toLocaleString('de-DE')}`;

      console.warn(warningMessage);
      return;
    }

    const channel = await client.channels.fetch(config.CHANNEL_ID);
    if (!channel?.isTextBased()) {
      console.error('❌ Channel nicht gefunden oder kein Text-Channel');
      return;
    }

    if (message.content === '!Start') {
      const startEmbed = new EmbedBuilder()
        .setTitle('🟢 Server Öffnung')
        .setDescription(
          `📢 **Der Server ist nun geöffnet!** 🎉\n\n` +
          `🌆 Tritt ein in die Straßen von Seattle und erlebe spannende Rollenspiel-Abenteuer!\n\n` +
          `📱 **Server Name:** ${config.SERVER_NAME}\n` +
          `🔢 **Server Code:** ${config.SERVER_CODE}\n\n` +
          `✨ **Wichtige Infos:**\n` +
          `• Halte dich an unsere Serverregeln\n` +
          `• Respektvolles RP ist Pflicht\n` +
          `• Bei Problemen wende dich an unser Team\n\n`
        )
        .setColor(0x00FF00)
        .setTimestamp()
        .setThumbnail(config.SERVER_IMAGE);

      await channel.send({
        content: `<@&${config.STATUS_PING_ROLE_ID}>`,
        embeds: [startEmbed]
      });
      await message.delete().catch(() => {});

    } else if (message.content === '!End') {
      const endEmbed = new EmbedBuilder()
        .setTitle('🔴 Server Schließung')
        .setDescription(
          `🌃 Vielen Dank für einen weiteren großartigen Tag in ${config.SERVER_NAME}!\n\n` +
          `📱 **Server-Name:** ${config.SERVER_NAME}\n` +
          `🔢 **Server-Code:** ${config.SERVER_CODE}\n\n` +
          `💤 **Bis bald, Bürger!**\n` +
          `• Nutzt die Zeit für Charakter-Entwicklungen\n` +
          `• Plant euer nächstes RP-Erlebniss\n` +
          `• Bei Fragen steht euch unser Team im Discord zur Verfügung\n\n` +
          `🎭 "Jede geschlossene Tür ist der Anfang eines neuen Abenteuers..."`
        )
        .setColor(0xFF0000)
        .setTimestamp()
        .setThumbnail(config.SERVER_IMAGE);

      await channel.send({
        content: `<@&${config.STATUS_PING_ROLE_ID}>`,
        embeds: [endEmbed]
      });
      await message.delete().catch(() => {});

    } else if (message.content === '!offline') {
      const shutdownMessage = `⚠️ **Bot wird heruntergefahren**\n` +
        `**Benutzer:** ${message.author.tag} (${message.author.id})\n` +
        `**Zeitpunkt:** ${new Date().toLocaleString('de-DE')}`;

      console.log(shutdownMessage);

      const reply = await message.reply('Bot wird in 10 Sekunden heruntergefahren...');

      setTimeout(async () => {
        try {
          if (message.deletable) await message.delete();
          if (reply.deletable) await reply.delete();
        } catch (error) {
          console.error('Fehler beim Löschen:', error);
        }
      }, 10000);

      setTimeout(() => {
        client.destroy();
        process.exit(0);
      }, 20000);
    }
  } catch (error) {
    console.error('Fehler bei Nachrichtenverarbeitung:', error);
  }
});

client.on('guildMemberAdd', async (member) => {
  try {
    const role = await member.guild.roles.fetch('1358201621502496869');
    if (!role) {
      console.error('❌ Willkommens-Rolle nicht gefunden');
      return;
    }
    
    await member.roles.add(role);
    console.log(`✅ Rolle **${role.name}** an ${member.user.tag} vergeben`);
    
  } catch (error) {
    console.error('Fehler bei der Willkommens-Rolle:', error);
  }
});

client.login(config.DISCORD_TOKEN);