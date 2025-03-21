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

  return { trigger, bonusTrigger, bonusPoolSuffix };
};

const spendPoolHandler = async messageId => {
  const message = ChatMessage.get(messageId);
  const dicePoolsData = await game.settings.get("dicePools", "data");
  const data = dicePoolsData ? JSON.parse(dicePoolsData) : null;

  const { trigger, bonusTrigger, bonusPoolSuffix } = getSpenderConfig();

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

let socket;

Hooks.once("socketlib.ready", () => {
  socket = window.socketlib.registerModule("dice-pool-spender");
  socket.register("spendPool", spendPoolHandler);
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

  $("#chat-controls").find(".chat-control-icon").after(`
    <label class="chat-control-icon" data-dice-pool-spender-button="action" style="margin-left: 5px;" title="Action Die">AD</label>
    <label class="chat-control-icon" data-dice-pool-spender-button="bonus" style="margin-left: 5px;" title="Bonus Action Die">B</label>
  `);

  $(document).on("click", "[data-dice-pool-spender-button]", function () {
    const $chatMessage = $("#chat-message");
    const $this = $(this);
    const { trigger, bonusTrigger } = getSpenderConfig();
    const buttonType = $this.data("dice-pool-spender-button");
    if (buttonType === "action") {
      $("#chat-message").val($chatMessage.val() + `[${trigger}]`);
    } else if (buttonType === "bonus") {
      $("#chat-message").val(
        $chatMessage.val() + `[${trigger}${bonusTrigger}]`
      );
    }
  });

  if (typeof game.modules.get("dice-so-nice") !== "undefined") {
    Hooks.on("diceSoNiceRollComplete", async messageId => {
      const message = ChatMessage.get(messageId);
      if (game.user.id === message.user.id) {
        await socket.executeAsGM("spendPool", messageId);
      }
    });
  } else {
    Hooks.on("renderChatMessage", async message => {
      if (game.user.id === message.user.id) {
        await socket.executeAsGM("spendPool", message.id);
      }
    });
  }
});
