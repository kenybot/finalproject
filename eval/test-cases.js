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
  // Note: image files are placeholders under eval/images/.
  // The eval runner skips a test and prints "SKIPPED — image not found"
  // if the image file does not exist at the given path.

  {
    type: 'pixel-art',
    input: {
      imagePath: 'eval/images/character.png',
      question: 'My pixel art character looks flat and lacks depth',
    },
    label: {
      mustContain: ['shading', 'highlight', 'shadow', 'contrast', 'light', 'depth', 'palette'],
    },
  },

  {
    type: 'pixel-art',
    input: {
      imagePath: 'eval/images/tileset.png',
      question: 'How can I improve my tileset readability?',
    },
    label: {
      mustContain: ['outline', 'contrast', 'color', 'border', 'tile', 'readable', 'edge'],
    },
  },

  {
    type: 'pixel-art',
    input: {
      imagePath: 'eval/images/character.png',
      question: 'How do I make my sprite look more polished?',
    },
    label: {
      mustContain: ['anti-alias', 'dither', 'outline', 'detail', 'pixel', 'clean', 'consistent'],
    },
  },

  {
    type: 'pixel-art',
    input: {
      imagePath: 'eval/images/background.png',
      question: 'My background feels too busy, how do I simplify it?',
    },
    label: {
      mustContain: ['palette', 'reduce', 'color', 'simplify', 'contrast', 'foreground', 'layer'],
    },
  },
];

module.exports = testCases;
