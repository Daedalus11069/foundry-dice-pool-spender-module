const getSpenderConfig = () => {
  let fallbackTrigger = game.settings.get(
    "dice-pool-spender",
    "fallbackTrigger"
  );
  if (fallbackTrigger === "") {
    fallbackTrigger = "action die";
  }

  let trigger = game.settings.get("dice-pool-spender", "trigger");
  if (trigger === "") {
    trigger = fallbackTrigger;
  }
  let fallbackBonusTrigger = game.settings.get(
    "dice-pool-spender",
    "fallbackBonusTrigger"
  );
  if (fallbackBonusTrigger === "") {
    fallbackBonusTrigger = "+b";
  }

  let bonusTrigger = game.settings.get("dice-pool-spender", "bonusTrigger");
  if (bonusTrigger === "") {
    bonusTrigger = fallbackBonusTrigger;
  }

  let bonusPoolSuffix = game.settings.get(
    "dice-pool-spender",
    "bonusPoolSuffix"
  );
  if (bonusPoolSuffix === "") {
    bonusPoolSuffix = "bonus";
  }

  let addPoolDice =
    game.settings.get("dice-pool-spender", "addPoolDice") || false;
  if (addPoolDice === "" || addPoolDice === null) {
    addPoolDice = false;
  }

  const dieExplodes = game.settings.get("dice-pool-spender", "dieExplodes");

  return { trigger, bonusTrigger, bonusPoolSuffix, addPoolDice, dieExplodes };
};

const spendPoolHandler = (messageId, trigger, bonusTrigger) => {
  const message = ChatMessage.get(messageId);
  const dicePoolsData = game.settings.get("dicePools", "data");
  const data = !!dicePoolsData ? JSON.parse(dicePoolsData) : null;

  const { bonusPoolSuffix } = getSpenderConfig();

  if (data !== null) {
    if (typeof message.rolls !== "undefined" && message.rolls.length > 0) {
      const { rolls } = message;
      for (const roll of rolls) {
        for (const term of roll.terms) {
          const { flavor } = term;
          const triggerIdx = flavor.indexOf(trigger);
          if (triggerIdx >= 0) {
            const flavorRest = flavor.slice(triggerIdx + trigger.length).trim();
            let speakerAlias = message.speaker.alias;
            if (flavorRest.indexOf(bonusTrigger) >= 0) {
              speakerAlias += ` ${bonusPoolSuffix}`;
            }
            speakerAlias = speakerAlias.toLowerCase();
            const dicePoolIdx = data.findIndex(
              ({ name }) => name.toLowerCase() === speakerAlias
            );
            if (dicePoolIdx >= 0) {
              dicePools.decreaseDicePool(dicePoolIdx);
            }
          }
        }
      }
    }
  }
};

const spendPoolChatHandler = (message, trigger, bonusTrigger) => {
  if (message.rolls.length === 0) {
    const dicePoolsData = game.settings.get("dicePools", "data");
    const data = !!dicePoolsData ? JSON.parse(dicePoolsData) : null;

    const flavor = message.content;
    const { bonusPoolSuffix } = getSpenderConfig();
    const triggerIdx = flavor.indexOf(trigger);
    if (triggerIdx >= 0) {
      const flavorRest = flavor.slice(triggerIdx + trigger.length).trim();
      let speakerAlias = message.speaker.alias;
      if (flavorRest.indexOf(bonusTrigger) >= 0) {
        speakerAlias += ` ${bonusPoolSuffix}`;
      }
      speakerAlias = speakerAlias.toLowerCase();
      const dicePoolIdx = data.findIndex(
        ({ name }) => name.toLowerCase() === speakerAlias
      );
      if (dicePoolIdx >= 0) {
        dicePools.decreaseDicePool(dicePoolIdx);
      }
    }
  }
};

const getDicePoolFormula = (speakerAlias, data = []) => {
  const dicePoolIdx = data.findIndex(
    ({ name }) => name.toLowerCase() === speakerAlias
  );
  if (dicePoolIdx >= 0) {
    const formula = data[dicePoolIdx].diceFormat;
    return formula;
  }
};

const addPoolDiceToTray = function (buttonType, data = []) {
  const { bonusPoolSuffix, addPoolDice } = getSpenderConfig();
  if (addPoolDice) {
    if (CONFIG.DICETRAY) {
      let speakerAlias = game.user?.character?.name || game.user.name;
      if (buttonType === "bonus") {
        speakerAlias += ` ${bonusPoolSuffix}`;
      }
      speakerAlias = speakerAlias.toLowerCase();

      const dicePoolIdx = data.findIndex(
        ({ name }) => name.toLowerCase() === speakerAlias
      );
      if (dicePoolIdx >= 0) {
        const formula = data[dicePoolIdx].diceFormat;
        CONFIG.DICETRAY.updateChatDice({ formula }, "add", $("#chat"));
      }
    }
  }
};

const subPoolDiceFromTray = function (buttonType, data = []) {
  const { bonusPoolSuffix, addPoolDice } = getSpenderConfig();
  if (addPoolDice) {
    if (CONFIG.DICETRAY) {
      let speakerAlias = game.user?.character?.name || game.user.name;
      if (buttonType === "bonus") {
        speakerAlias += ` ${bonusPoolSuffix}`;
      }
      speakerAlias = speakerAlias.toLowerCase();

      const dicePoolIdx = data.findIndex(
        ({ name }) => name.toLowerCase() === speakerAlias
      );
      if (dicePoolIdx >= 0) {
        const formula = data[dicePoolIdx].diceFormat;
        CONFIG.DICETRAY.updateChatDice({ formula }, "sub", $("#chat"));
      }
    }
  }
};

const explodingDieHandler = ($chatMessage, formula) => {
  $chatMessage.val(
    $chatMessage.val().replace(new RegExp(`(${formula})`, "i"), "$1x")
  );
};

const spenderButtonHandler = function () {
  const $chatMessage = $("#chat-message");
  const $this = $(this);
  const { trigger, bonusTrigger, bonusPoolSuffix, dieExplodes } =
    getSpenderConfig();
  const buttonType = $this.data("dice-pool-spender-button");
  const dicePoolsData = game.settings.get("dicePools", "data");
  const data = dicePoolsData ? JSON.parse(dicePoolsData) : null;
  const regTrigger = RegExp.escape(trigger);
  const regBonusTrigger = RegExp.escape(bonusTrigger);

  if (buttonType === "action") {
    if (
      new RegExp(`\\[${regTrigger}\\]`, "i").test($chatMessage.val()) === false
    ) {
      const fullTriggerStrMatch = $chatMessage
        .val()
        .match(new RegExp(`\\[(${regTrigger}(${regBonusTrigger})?)\\]`, "i"));
      if (fullTriggerStrMatch !== null) {
        $chatMessage.val(
          $chatMessage
            .val()
            .replace(
              new RegExp(`\\[${regTrigger}(${regBonusTrigger})?\\]`, "i"),
              ""
            )
        );
        if (dieExplodes) {
          let speakerAlias = game.user?.character?.name || game.user.name;
          speakerAlias += ` ${bonusPoolSuffix}`;
          speakerAlias = speakerAlias.toLowerCase();
          const formula = getDicePoolFormula(speakerAlias, data);
          $chatMessage.val(
            $chatMessage.val().replace(new RegExp(`(${formula})x`, "i"), "$1")
          );
        }
        subPoolDiceFromTray("bonus", data);
      }
      addPoolDiceToTray(buttonType, data);
      $chatMessage.val($chatMessage.val() + `[${trigger}]`);
      if (dieExplodes) {
        let speakerAlias = game.user?.character?.name || game.user.name;
        speakerAlias = speakerAlias.toLowerCase();
        const formula = getDicePoolFormula(speakerAlias, data);
        explodingDieHandler($chatMessage, formula);
      }
    }
  } else if (buttonType === "bonus") {
    if (
      new RegExp(`\\[${regTrigger}${regBonusTrigger}\\]`, "i").test(
        $chatMessage.val()
      ) === false
    ) {
      const fullTriggerStrMatch = $chatMessage
        .val()
        .match(new RegExp(`\\[(${regTrigger}(${regBonusTrigger})?)\\]`, "i"));
      if (fullTriggerStrMatch !== null) {
        $chatMessage.val(
          $chatMessage
            .val()
            .replace(
              new RegExp(`\\[${regTrigger}(${regBonusTrigger})?\\]`, "i"),
              ""
            )
        );
        if (dieExplodes) {
          let speakerAlias = game.user?.character?.name || game.user.name;
          // speakerAlias += ` ${bonusPoolSuffix}`;
          speakerAlias = speakerAlias.toLowerCase();
          const formula = getDicePoolFormula(speakerAlias, data);
          $chatMessage.val(
            $chatMessage
              .val()
              .replace(new RegExp(`(${RegExp.escape(formula)})x`, "i"), "$1")
          );
        }
        subPoolDiceFromTray("action", data);
        addPoolDiceToTray(buttonType, data);
        $chatMessage.val($chatMessage.val() + `[${fullTriggerStrMatch[1]}]`);
        if (dieExplodes) {
          let speakerAlias = game.user?.character?.name || game.user.name;
          speakerAlias += ` ${bonusPoolSuffix}`;
          speakerAlias = speakerAlias.toLowerCase();
          const formula = getDicePoolFormula(speakerAlias, data);
          explodingDieHandler($chatMessage, formula);
        }
      } else {
        if (dieExplodes) {
          let speakerAlias = game.user?.character?.name || game.user.name;
          speakerAlias += ` ${bonusPoolSuffix}`;
          speakerAlias = speakerAlias.toLowerCase();
          const formula = getDicePoolFormula(speakerAlias, data);
          $chatMessage.val(
            $chatMessage.val().replace(new RegExp(`(${formula})x`, "i"), "$1")
          );
        }
        addPoolDiceToTray(buttonType, data);
        if (dieExplodes) {
          let speakerAlias = game.user?.character?.name || game.user.name;
          speakerAlias += ` ${bonusPoolSuffix}`;
          speakerAlias = speakerAlias.toLowerCase();
          const formula = getDicePoolFormula(speakerAlias, data);
          explodingDieHandler($chatMessage, formula);
        }
      }
      if (new RegExp(regTrigger, "i").test($chatMessage.val())) {
        $chatMessage.val($chatMessage.val().slice(0, -1) + `${bonusTrigger}]`);
      } else {
        $chatMessage.val($chatMessage.val() + `[${trigger}${bonusTrigger}]`);
      }
    }
  }
};

let socket;

Hooks.once("socketlib.ready", () => {
  socket = window.socketlib.registerModule("dice-pool-spender");
  socket.register("spendPool", spendPoolHandler);
  socket.register("spendPoolChat", spendPoolChatHandler);
});

Hooks.once("ready", () => {
  game.settings.register("dice-pool-spender", "fallbackTrigger", {
    scope: "world",
    config: true,
    name: "DICEPOOLSPENDER.global.FallbackTrigger.Name",
    hint: "DICEPOOLSPENDER.global.FallbackTrigger.Hint",
    type: String,
    default: "action die"
  });
  game.settings.register("dice-pool-spender", "fallbackBonusTrigger", {
    scope: "world",
    config: true,
    name: "DICEPOOLSPENDER.global.FallbackBonusTrigger.Name",
    hint: "DICEPOOLSPENDER.global.FallbackBonusTrigger.Hint",
    type: String,
    default: "+b"
  });
  game.settings.register("dice-pool-spender", "bonusPoolSuffix", {
    scope: "world",
    config: true,
    name: "DICEPOOLSPENDER.global.BonusPoolSuffix.Name",
    hint: "DICEPOOLSPENDER.global.BonusPoolSuffix.Hint",
    type: String,
    default: "bonus"
  });
  game.settings.register("dice-pool-spender", "trigger", {
    scope: "client",
    config: true,
    name: "DICEPOOLSPENDER.local.Trigger.Name",
    hint: "DICEPOOLSPENDER.local.Trigger.Hint",
    type: String,
    default: ""
  });
  game.settings.register("dice-pool-spender", "bonusTrigger", {
    scope: "client",
    config: true,
    name: "DICEPOOLSPENDER.local.BonusTrigger.Name",
    hint: "DICEPOOLSPENDER.local.BonusTrigger.Hint",
    type: String,
    default: ""
  });
  game.settings.register("dice-pool-spender", "addPoolDice", {
    scope: "client",
    config: true,
    name: "DICEPOOLSPENDER.local.AddPoolDice.Name",
    hint: "DICEPOOLSPENDER.local.AddPoolDice.Hint",
    type: Boolean,
    default: false
  });
  game.settings.register("dice-pool-spender", "dieExplodes", {
    scope: "world",
    config: true,
    name: "DICEPOOLSPENDER.global.DieExplodes.Name",
    hint: "DICEPOOLSPENDER.global.DieExplodes.Hint",
    type: Boolean,
    default: true
  });

  $("#chat-controls").find(".chat-control-icon").after(`
    <label class="chat-control-icon" data-dice-pool-spender-button="action" style="margin-left: 5px;" title="${game.i18n.format(
      "DICEPOOLSPENDER.ActionDie"
    )}">${game.i18n.format("DICEPOOLSPENDER.AD")}</label>
    <label class="chat-control-icon" data-dice-pool-spender-button="bonus" style="margin-left: 5px;" title="${game.i18n.format(
      "DICEPOOLSPENDER.BonusDie"
    )}">${game.i18n.format("DICEPOOLSPENDER.B")}</label>
  `);

  $(document).on(
    "click",
    "[data-dice-pool-spender-button]",
    spenderButtonHandler
  );

  if (typeof game.modules.get("dice-so-nice") !== "undefined") {
    Hooks.on("diceSoNiceRollComplete", async messageId => {
      const { trigger, bonusTrigger } = getSpenderConfig();
      const message = ChatMessage.get(messageId);
      if (game.user.id === message.user.id) {
        await socket.executeAsGM("spendPool", messageId, trigger, bonusTrigger);
      }
    });
    Hooks.on("renderChatMessage", async message => {
      const { trigger, bonusTrigger } = getSpenderConfig();
      if (game.user.id === message.user.id) {
        await socket.executeAsGM(
          "spendPoolChat",
          message,
          trigger,
          bonusTrigger
        );
      }
    });
  } else {
    Hooks.on("renderChatMessage", async message => {
      const { trigger, bonusTrigger } = getSpenderConfig();
      if (game.user.id === message.user.id) {
        await socket.executeAsGM(
          "spendPool",
          message.id,
          trigger,
          bonusTrigger
        );
      }
    });
    Hooks.on("renderChatMessage", async message => {
      const { trigger, bonusTrigger } = getSpenderConfig();
      if (game.user.id === message.user.id) {
        await socket.executeAsGM(
          "spendPoolChat",
          message,
          trigger,
          bonusTrigger
        );
      }
    });
  }
});
