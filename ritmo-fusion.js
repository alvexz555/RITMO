
/* 
 * GG FIT × RITMO
 * Camada de rotina diária.
 *
 * Princípios:
 * - Vida representa constância.
 * - XP nunca é removido por falhas.
 * - Dano só existe no modo disciplinado.
 * - O dia precisa ser iniciado antes de ser fechado.
 * - A revisão só pode acontecer uma vez por dia.
 */

import { todayISO, shiftISO } from "./engine.js";

export const RITMO = {
  maxLife: 100,
  perfectHeal: 20,

  damage: {
    high: 20,
    medium: 15,
    low: 10,
  },
};

/* =========================================================
   ESTADO INICIAL
========================================================= */

export function defaultRitmo(dateISO = todayISO()) {
  return {
    date: dateISO,
    started: false,
    closed: false,

    hp: RITMO.maxLife,

    disciplined: false,

    perfectDays: 0,

    review: null,
  };
}

/* =========================================================
   NORMALIZAÇÃO DO ESTADO
========================================================= */

export function ensureRitmo(
  state,
  dateISO = state?.ritmo?.date || todayISO()
) {
  if (!state) return state;

  const previous = state.ritmo;

  /* Cria estrutura caso ainda não exista. */
  if (!previous || typeof previous !== "object") {
    return {
      ...state,
      ritmo: defaultRitmo(dateISO),
    };
  }

  /* Virada de dia. */
  if (previous.date !== dateISO) {
    return {
      ...state,

      ritmo: {
        ...defaultRitmo(dateISO),

        disciplined: Boolean(previous.disciplined),

        perfectDays: previous.perfectDays || 0,
      },
    };
  }

  /* Normaliza dados existentes. */
  return {
    ...state,

    ritmo: {
      ...defaultRitmo(dateISO),

      ...previous,

      hp: Math.max(
        0,
        Math.min(
          RITMO.maxLife,
          Number(previous.hp) || 0
        )
      ),

      review: previous.review || null,
    },
  };
}

/* =========================================================
   MODO DISCIPLINADO
========================================================= */

export function setDisciplined(
  state,
  on,
  dateISO = state?.ritmo?.date || todayISO()
) {
  const normalized = ensureRitmo(state, dateISO);

  if (normalized.ritmo.closed) {
    return {
      state: normalized,
      ok: false,
      reason: "closed",
    };
  }

  return {
    state: {
      ...normalized,

      ritmo: {
        ...normalized.ritmo,

        disciplined: Boolean(on),
      },
    },

    ok: true,
  };
}

/* =========================================================
   INICIAR DIA
========================================================= */

export function startDay(
  state,
  dateISO = state?.ritmo?.date || todayISO()
) {
  const normalized = ensureRitmo(state, dateISO);

  if (normalized.ritmo.started) {
    return {
      state: normalized,
      ok: false,
      reason: "started",
    };
  }

  return {
    state: {
      ...normalized,

      ritmo: {
        ...normalized.ritmo,

        started: true,
      },
    },

    ok: true,
  };
}

/* =========================================================
   MISSÕES DO RITMO
========================================================= */

/*
 * As missões são derivadas de fatos registrados
 * pelo próprio GG FIT.
 *
 * Não inventamos conclusão.
 * Se não existe registro, permanece pendente.
 */

export function ritmoMissions(
  state,
  dateISO = todayISO()
) {
  const habitLog =
    (state.habitLog || {})[dateISO] || [];

  const goodToday = habitLog.filter((id) =>
    ["agua", "alongar", "sono"].includes(id)
  ).length;

  return [
    {
      id: "treino",

      icon: "🏋️",

      label: "Treino do dia",

      priority: "high",

      done: state.lastWorkoutDate === dateISO,

      detail:
        state.lastWorkoutDate === dateISO
          ? "Concluído"
          : "Missão principal",
    },

    {
      id: "habitos",

      icon: "🔁",

      label: "2 hábitos bons",

      priority: "medium",

      done: goodToday >= 2,

      detail: `${goodToday}/2 registrados`,
    },

    {
      id: "agua",

      icon: "💧",

      label: "Beber água",

      priority: "low",

      done: habitLog.includes("agua"),

      detail: habitLog.includes("agua")
        ? "Registrado"
        : "1 copo a cada 2h",
    },
  ];
}

/* =========================================================
   PROGRESSO DIÁRIO
========================================================= */

export function ritmoProgress(
  state,
  dateISO = todayISO()
) {
  const missions = ritmoMissions(state, dateISO);

  const done = missions.filter(
    (mission) => mission.done
  ).length;

  const total = missions.length;

  return {
    missions,

    done,

    total,

    perfect: done === total,

    pct: total
      ? Math.round((done / total) * 100)
      : 0,
  };
}

/* =========================================================
   FECHAR DIA
========================================================= */

/*
 * Dano:
 * - Só no modo disciplinado.
 * - Só para missões não concluídas.
 * - Só depois de iniciar o dia.
 *
 * Recuperação:
 * - Dia perfeito recupera 20 de vida.
 *
 * XP:
 * - Nunca é removido.
 */

export function closeDay(
  state,
  dateISO = state?.ritmo?.date || todayISO()
) {
  let normalized = ensureRitmo(state, dateISO);

  if (!normalized.ritmo.started) {
    return {
      state: normalized,
      ok: false,
      reason: "not-started",
    };
  }

  if (normalized.ritmo.closed) {
    return {
      state: normalized,
      ok: false,
      reason: "closed",
    };
  }

  const progress = ritmoProgress(
    normalized,
    dateISO
  );

  const missed = progress.missions.filter(
    (mission) => !mission.done
  );

  /* Calcula dano somente se o modo estiver ativo. */
  const damage = normalized.ritmo.disciplined
    ? missed.reduce(
        (sum, mission) =>
          sum + RITMO.damage[mission.priority],
        0
      )
    : 0;

  /* Recuperação por dia perfeito. */
  const heal = progress.perfect
    ? RITMO.perfectHeal
    : 0;

  const hp = Math.max(
    0,
    Math.min(
      RITMO.maxLife,
      normalized.ritmo.hp - damage + heal
    )
  );

  const review = {
    date: dateISO,

    done: progress.done,

    total: progress.total,

    missed: missed.map(
      (mission) => mission.id
    ),

    damage,

    heal,

    disciplined:
      normalized.ritmo.disciplined,

    hp,

    at: Date.now(),
  };

  normalized = {
    ...normalized,

    ritmo: {
      ...normalized.ritmo,

      closed: true,

      hp,

      review,

      perfectDays:
        (normalized.ritmo.perfectDays || 0) +
        (progress.perfect ? 1 : 0),
    },
  };

  return {
    state: normalized,

    ok: true,

    review,

    perfect: progress.perfect,

    damage,

    heal,
  };
}

/* =========================================================
   TEXTO DA REVISÃO
========================================================= */

export function reviewText(review) {
  if (!review) return "";

  if (review.damage > 0) {
    return (
      `Dia fechado: ${review.done}/${review.total}` +
      ` · −${review.damage} de vida.` +
      ` Sem perda de XP.`
    );
  }

  if (review.heal > 0) {
    return (
      `Dia perfeito: ${review.done}/${review.total}` +
      ` · +${review.heal} de vida.`
    );
  }

  return (
    `Dia fechado: ${review.done}/${review.total}.` +
    ` Vida intacta.`
  );
}

/* =========================================================
   EXPORTAÇÕES
========================================================= */

export {
  todayISO,
  shiftISO,
};
