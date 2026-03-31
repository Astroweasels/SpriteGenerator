import React from 'react';
import './AboutModal.css';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="about-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🚀 About AstroSprite</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="about-hero">
            <span className="about-logo">🎮</span>
            <div>
              <h3>AstroSprite</h3>
              <p className="about-tagline">A procedural pixel-art editor built for humans and AI agents alike.</p>
            </div>
          </div>

          <div className="about-section">
            <h4>The Idea</h4>
            <p>
              Most sprite tools fall into two camps: manual pixel editors (draw everything by hand)
              or AI image generators (feed a prompt to a model and hope for the best). I wanted
              something in between — a tool that could <strong>procedurally generate</strong> game-ready
              character sprites with deterministic, structured output while still letting you hand-edit
              every pixel when the algorithm gets something wrong.
            </p>
            <p>
              The twist: expose the entire generation engine as a <strong>REST API with an OpenAPI spec</strong>,
              so any AI coding agent can call it as a tool — no image-model API key required, no
              per-call cost, and every response is a clean sprite sheet with named animation sequences.
            </p>
          </div>

          <div className="about-section">
            <h4>Why It Exists</h4>
            <p>
              I'm building a game in Godot, and I want an AI agent to help me make it. That agent
              needs character sprites — walk cycles, idle animations, attack sequences — and it needs
              them fast, in a format a game engine can consume directly. Rather than manually drawing
              assets or paying for AI image generation that produces inconsistent results, I built a
              tool that the agent can call programmatically to get exactly what it needs.
            </p>
            <p>
              This project serves double duty: it's a practical asset pipeline for my own game
              development, and it's a portfolio piece that demonstrates full-stack engineering
              across a real product — from canvas rendering and animation systems to serverless APIs
              and developer tooling.
            </p>
          </div>

          <div className="about-section">
            <h4>How It Was Built</h4>
            <p>
              AstroSprite started as a blank Vite + React + TypeScript project and was built
              iteratively, feature by feature, in collaboration with an AI coding assistant. Every
              component — the pixel canvas, layer system, animation sequencer, procedural generator,
              preset templates, export pipeline, and REST API — was designed, implemented, and
              tested in a single continuous development session.
            </p>
            <div className="about-stack">
              <div className="about-stack-item">
                <strong>Frontend</strong>
                <span>React 19, TypeScript, Vite, HTML5 Canvas</span>
              </div>
              <div className="about-stack-item">
                <strong>API</strong>
                <span>Node.js, @napi-rs/canvas, AWS Lambda, SAM</span>
              </div>
              <div className="about-stack-item">
                <strong>Spec</strong>
                <span>OpenAPI 3.0, Swagger UI</span>
              </div>
            </div>
          </div>

          <div className="about-section">
            <h4>What Makes It Different</h4>
            <ul className="about-list">
              <li>
                <strong>Procedural, not generative AI.</strong> Sprites are built algorithmically
                from templates, poses, and color palettes — no neural network, no API key, no
                unpredictable output.
              </li>
              <li>
                <strong>Agent-first API.</strong> The REST endpoint is designed to be discovered and
                called by AI agents via the OpenAPI spec. Feed the spec to any tool-calling framework
                and the agent can generate sprites autonomously.
              </li>
              <li>
                <strong>Full editor + API in one.</strong> Hand-draw when you want precision, generate
                when you want speed, and mix both workflows on the same canvas.
              </li>
              <li>
                <strong>Game-engine-ready output.</strong> Every generation produces named animation
                sequences (idle, walk, attack, etc.) with consistent frame dimensions — ready to
                drop into Godot, Unity, or any engine that reads sprite sheets.
              </li>
            </ul>
          </div>

          <div className="about-section">
            <h4>The Goal</h4>
            <p>
              Short term: use this tool as the sprite pipeline for my Godot game project, with an
              AI agent calling the API to generate and iterate on character assets as the game takes shape.
            </p>
            <p>
              Long term: demonstrate the kind of full-stack, product-minded engineering I bring to a
              team — taking an idea from zero to a working product with a clean API, thoughtful UX,
              and real-world utility.
            </p>
          </div>

          <div className="about-footer">
            <p>
              Built by <strong>Kole</strong> · 2025–2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
