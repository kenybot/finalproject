/**
 * eval/test-cases.js
 *
 * Labeled test cases for the Godot Dev Assistant evaluation suite.
 * Each test case has a type ('code-help' or 'pixel-art'), an input object,
 * and a label object with mustContain keywords used to score AI response quality.
 *
 * A test PASSES if ≥ 3 of the mustContain keywords are found in the AI response
 * (case-insensitive). See eval/run-eval.js for the full evaluation runner.
 *
 * Requirements: 8.1, 8.2
 */

'use strict';

const testCases = [
  // ─── Code Help Test Cases ────────────────────────────────────────────────────

  {
    type: 'code-help',
    input: {
      code: 'func move(): velocity.x = 50',
      question: 'Player movement feels slow',
    },
    label: {
      mustContain: ['velocity', 'acceleration', 'speed', 'sprint', '200', 'example'],
    },
  },

  {
    type: 'code-help',
    input: {
      code: 'func _ready(): connect("body_entered", self, "_on_body_entered")',
      question: 'How do I connect movement with animation?',
    },
    label: {
      mustContain: ['AnimationPlayer', 'state', 'animation_tree', 'blend', 'signal', 'connect'],
    },
  },

  {
    type: 'code-help',
    input: {
      code: 'var health = 100',
      question: 'How do I implement a health system with UI?',
    },
    label: {
      mustContain: ['ProgressBar', 'Label', 'signal', 'update', 'HUD', 'scene'],
    },
  },

  {
    type: 'code-help',
    input: {
      code: 'func _process(delta): position.x += 1',
      question: 'How do I make smooth movement?',
    },
    label: {
      mustContain: ['delta', 'lerp', 'velocity', 'move_and_slide', 'acceleration', 'smooth'],
    },
  },

  {
    type: 'code-help',
    input: {
      code: 'func jump(): velocity.y = -500',
      question: 'How do I add double jump?',
    },
    label: {
      mustContain: ['jump_count', 'is_on_floor', 'condition', 'counter', 'reset', 'example'],
    },
  },

  {
    type: 'code-help',
    input: {
      code: 'extends KinematicBody2D',
      question: 'What is the best way to structure a player scene?',
    },
    label: {
      mustContain: ['script', 'node', 'scene', 'component', 'state', 'structure'],
    },
  },

  // ─── Pixel Art Test Cases ─────────────────────────────────────────────────────

  {
    type: 'pixel-art',
    input: {
      imagePath: 'eval/images/duck.jpg',
      question: 'How can I improve the shading and depth of this sprite?',
    },
    label: {
      mustContain: ['shading', 'highlight', 'shadow', 'contrast', 'light', 'depth', 'color'],
    },
  },

  {
    type: 'pixel-art',
    input: {
      imagePath: 'eval/images/frog.jpg',
      question: 'How do I make this character look more polished for a game?',
    },
    label: {
      mustContain: ['outline', 'detail', 'pixel', 'color', 'clean', 'sprite', 'palette'],
    },
  },

  {
    type: 'pixel-art',
    input: {
      imagePath: 'eval/images/pikachu.jpg',
      question: 'What improvements would make this sprite more readable at small sizes?',
    },
    label: {
      mustContain: ['outline', 'contrast', 'color', 'readable', 'small', 'pixel', 'detail'],
    },
  },

  {
    type: 'pixel-art',
    input: {
      imagePath: 'eval/images/watermelon.jpg',
      question: 'How can I reduce the color palette while keeping this looking good?',
    },
    label: {
      mustContain: ['palette', 'reduce', 'color', 'dither', 'contrast', 'simplify', 'shade'],
    },
  },
];

module.exports = testCases;
