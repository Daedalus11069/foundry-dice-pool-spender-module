const spendPoolHandler = async messageId => {
  if (game.user.isGM) {
    const message = ChatMessage.get(messageId);
    const dicePoolsData = await game.settings.get("dicePools", "data");
    const data = dicePoolsData ? JSON.parse(dicePoolsData) : null;

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
    if (data !== null) {
      if (typeof message.rolls !== "undefined" && message.rolls.length > 0) {
        const { rolls } = message;
        for (const roll of rolls) {
          for (const dice of roll.dice) {
            const { flavor } = dice;
            const triggerIdx = flavor.indexOf(trigger);
            if (triggerIdx >= 0) {
              const flavorRest = flavor
                .slice(triggerIdx + trigger.length)
                .trim();
              if (flavorRest !== "") {
                const possibilities = [];
                for (const [idx, pool] of data.entries()) {
                  const reg = new RegExp(pool.name, "i");
                  if (reg.test(flavorRest)) {
                    possibilities.push({ idx, name: pool.name });
                  }
                }
                possibilities.sort((a, b) => b.name.length - a.name.length);
                let dicePoolIdx = -1;
                if (possibilities.length > 0) {
                  dicePoolIdx = possibilities[0].idx;
                }
                if (dicePoolIdx >= 0) {
                  dicePools.decreaseDicePool(dicePoolIdx);
                }
              }
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

Hooks.once("init", () => {
  game.settings.register("dice-pool-spender", "fallbackTrigger", {
    scope: "world",
    config: true,
    name: "DICEPOOLSPENDER.global.FallbackTrigger.Name",
    hint: "DICEPOOLSPENDER.global.FallbackTrigger.Hint",
    type: String,
    default: "action die"
  });
  game.settings.register("dice-pool-spender", "trigger", {
    scope: "client",
    config: true,
    name: "DICEPOOLSPENDER.local.Trigger.Name",
    hint: "DICEPOOLSPENDER.local.Trigger.Hint",
    type: String,
    default: ""
  });
});

Hooks.once("ready", () => {
  if (game.user.isGM) {
    if (typeof game.modules.get("dice-so-nice") !== "undefined") {
      Hooks.on("diceSoNiceRollComplete", async messageId => {
        await socket.executeAsGM("spendPool", messageId);
      });
    } else {
      Hooks.on("renderChatMessage", async message => {
        await socket.executeAsGM("spendPool", message.id);
      });
    }
  }
});
