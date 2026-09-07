---
name: find-skills
description: >-
  Discover and install skills from the open agent skills ecosystem using the skills CLI.
  Use when the user asks to search for or install external skills.
---

# Skill: Find Skills

A meta-skill for discovering and installing skills from the open agent skills ecosystem (`skills.sh`).

## When to Use This Skill

Use this skill when:
- The user asks to discover or install a community skill.
- You need domain-specific workflows or tool configurations from external repositories.

## Core Commands

1. **Search for Skills:**
   ```bash
   npx -y skills find [query]
   ```
   *Example:* `npx -y skills find "react native"` or `npx -y skills find "supabase"`

2. **Install a Skill:**
   ```bash
   npx -y skills add [package-name]
   ```
   *Example:* `npx -y skills add vercel-labs/agent-skills@vercel-react-best-practices`

## Execution Workflow

1. **Search:** Run `npx -y skills find "<topic>"` to query the skills registry.
2. **Review:** Inspect the search results and present matching skills to the user.
3. **Install & Verify:** Run `npx -y skills add <package>` and inspect the installed `SKILL.md`.
