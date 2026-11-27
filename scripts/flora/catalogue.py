#!/usr/bin/env python3
"""Assign a species to every project, grow the specimens, and write the manifest.

    python3 scripts/flora/catalogue.py            # grow every specimen
    python3 scripts/flora/catalogue.py --review   # also grow the four-seed review set

This is the one place the garden's decisions live:

  * which species belongs to which of the site's five topics (`TOPIC_SPECIES`);
  * which topic each repository belongs to (`TOPIC_BY_REPO`), read from a
    repository's own `topic:` front matter when it has one — today none do, so
    the table below is the assignment, one line per repository, and the script
    prints every line it had to fall back on so a wrong one is easy to see;
  * the seed a repository always grows from: the first six hex digits of the
    slug's SHA-256, so a repository is the same plant on every build and on
    every machine, and nothing has to be remembered between runs.

Standard library only. It calls grow.py in-process, so there is one generator
and no second copy of the geometry.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)

import grow  # noqa: E402  (the generator, next to this file)

MANIFEST = os.path.join(ROOT, "_data", "flora.yml")
OUT_DIR = os.path.join(ROOT, "assets", "flora")

# The review set: four seeds per species, grown to be looked at side by side.
REVIEW_SEEDS = (1, 1201, 4891, 90210)

# Five topics, five species, one each (GALA-88). The species is the topic's
# silhouette; the label is what the page calls it.
TOPIC_SPECIES = {
    "data-informatics": "spire",
    "ai": "synapse",
    "matrices": "lattice",
    "kinematics": "joint",
    "cryptographic-proofs": "proof",
}

LABELS = {
    "spire": "Census Spire",
    "synapse": "Synapse Star",
    "lattice": "Lattice Thistle",
    "joint": "Joint Vine",
    "proof": "Proof Fern",
}

BLURBS = {
    "spire": "Records stacked on one mast, a plate per pass over the data.",
    "synapse": "Tendrils out to a bead, then a crown that fires all at once.",
    "lattice": "Square leaves at right angles, a bloom built on a grid.",
    "joint": "An elbowed chain of joints, with bells hung off the last of them.",
    "proof": "Each frond a lemma, each pinna a step, the capsule the thing proved.",
}

# Repository -> topic. A repository's own `topic:` front matter wins when it
# has one; this table is the assignment for the ones that do not, and it is the
# line to correct when a plant looks like it belongs to another plot. The
# comment after each line is the reason, taken from the repository's tagline.
TOPIC_BY_REPO = {
    "1brc-cpp": "data-informatics",           # a billion rows parsed six ways
    "91": "matrices",                         # firmware for a synth: wavetables and signal
    "bend-ml-lab": "ai",                      # training epochs and weight-space diagnostics
    "cairo_vault": "cryptographic-proofs",     # a Starknet contract holding balances
    "cannoli-hell": "kinematics",             # Bevy and Rapier: bodies, colliders, motion
    "coatcheck": "data-informatics",          # a contract measured against behaviour
    "coldfront": "kinematics",                # a game: things that move and collide
    "divulge": "ai",                          # AI-assisted reverse engineering
    "kotoba-line": "data-informatics",        # reading a document, one line at a time
    "macos-metal-vslam": "kinematics",        # a camera's motion and the map it recovers
    "mage": "matrices",                       # GPU kernels for Triton and CUDA
    "marigraph": "matrices",                  # a volatility surface, drawn in the terminal
    "ml-kem-ml-dsa-lab": "cryptographic-proofs",  # the NIST module-lattice standards
    "nanda-ts": "ai",                         # A2A agents, identity and a registry
    "qualia": "ai",                           # embodied agents and a JEPA runtime
    "quantum-superposition": "matrices",      # states and complex amplitudes
    "scenelab": "matrices",                   # template-driven arrangement control
    "space-bullet-hell": "kinematics",        # a shooter built on movement
    "topcoat-blocks": "data-informatics",     # a library of blocks, catalogued
    "zig-wasm-webgpu-hallway-shooter": "kinematics",  # a simulation compiled from Zig
}

# The fallback for a repository nobody has filed yet: one word per topic,
# matched against the tagline and the tags. It exists so a new repository gets a
# plant instead of an empty slot, and every match it makes is printed as a
# warning — a keyword is a guess, and the table above is the decision.
KEYWORDS = {
    "data-informatics": ("data", "dataset", "rows", "csv", "parser", "parsers", "storage",
                         "database", "query", "index", "profile", "profiler", "log", "logs",
                         "notebook", "statistics", "analysis", "document", "text", "catalog"),
    "ai": ("ai", "ml", "model", "models", "training", "neural", "agent", "agents", "llm",
           "inference", "jepa", "embedding", "learn", "learning", "reverse engineering"),
    "matrices": ("matrix", "matrices", "einsum", "tensor", "linear algebra", "kernel",
                 "kernels", "cuda", "triton", "surface", "amplitude", "amplitudes", "dsp",
                 "signal", "arrangement", "blas"),
    "kinematics": ("motion", "pose", "slam", "robot", "physics", "collider", "trajectory",
                   "shooter", "bullet", "game", "simulation", "camera", "webcam"),
    "cryptographic-proofs": ("proof", "proofs", "zero-knowledge", "zk", "snark", "stark",
                             "starknet", "kem", "dsa", "cipher", "hash", "contract",
                             "solidity", "cairo", "signature", "erc"),
}


def read_front_matter(path: str) -> dict:
    """The `key: value` pairs of a Jekyll document's front matter, unquoted."""
    fields = {}
    with open(path, encoding="utf-8") as handle:
        text = handle.read()
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not match:
        return fields
    for line in match.group(1).splitlines():
        if not line or line.startswith((" ", "-", "#")) or ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip().strip('"').strip("'")
    return fields


def read_topics() -> list:
    """_data/topics.yml, in file order: the site's own list, never a copy."""
    path = os.path.join(ROOT, "_data", "topics.yml")
    topics, current = [], None
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            if line.startswith("- "):
                if current:
                    topics.append(current)
                current = {}
                line = "  " + line[2:]
            if ":" in line and current is not None:
                key, _, value = line.strip().partition(":")
                current[key.strip()] = value.strip().strip('"').strip("'")
    if current:
        topics.append(current)
    return [t for t in topics if t.get("slug")]


def seed_for(text: str) -> int:
    """A stable seed from a name: six hex digits of its SHA-256."""
    return int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:6], 16)


def classify(slug: str, fields: dict) -> tuple:
    """The topic for one repository, and whether the answer was a guess."""
    if fields.get("topic"):
        return fields["topic"], False
    if slug in TOPIC_BY_REPO:
        return TOPIC_BY_REPO[slug], False
    haystack = " ".join(str(fields.get(k, "")) for k in ("title", "tagline", "tags")).lower()
    for topic, words in KEYWORDS.items():
        for word in words:
            if word in haystack:
                return topic, True
    return None, True


def grow_all(review_dirs=None) -> list:
    lines = []
    topics = read_topics()
    slugs = {t["slug"] for t in topics}
    missing = slugs - set(TOPIC_SPECIES)
    if missing:
        raise SystemExit(f"no species for topic(s): {', '.join(sorted(missing))} — add them to TOPIC_SPECIES")
    unknown = set(TOPIC_SPECIES) - slugs
    if unknown:
        raise SystemExit(f"TOPIC_SPECIES names topic(s) _data/topics.yml does not: {', '.join(sorted(unknown))}")

    os.makedirs(OUT_DIR, exist_ok=True)
    species_files, project_files = {}, []

    for topic in topics:
        species = TOPIC_SPECIES[topic["slug"]]
        seed = seed_for("plot:" + species)
        name = f"{species}-{seed}.svg"
        with open(os.path.join(OUT_DIR, name), "w", encoding="utf-8", newline="\n") as handle:
            handle.write(grow.grow(species, seed))
        species_files[topic["slug"]] = name
        lines.append(f"plot   {topic['slug']:<21} {species:<8} {name}")

    repo_dir = os.path.join(ROOT, "_repos")
    for entry in sorted(os.listdir(repo_dir)):
        if not entry.endswith(".md"):
            continue
        fields = read_front_matter(os.path.join(repo_dir, entry))
        slug = fields.get("slug") or entry[:-3]
        topic, guessed = classify(slug, fields)
        if topic is None:
            raise SystemExit(f"{slug}: no topic — add it to TOPIC_BY_REPO in this script")
        if topic not in TOPIC_SPECIES:
            raise SystemExit(f"{slug}: topic {topic!r} is not one of the site's five")
        species = TOPIC_SPECIES[topic]
        seed = seed_for(slug)
        name = f"{species}-{seed}.svg"
        path = os.path.join(OUT_DIR, name)
        if not os.path.exists(path):
            with open(path, "w", encoding="utf-8", newline="\n") as handle:
                handle.write(grow.grow(species, seed))
        project_files.append({
            "slug": slug,
            "title": fields.get("title") or slug,
            "topic": topic,
            "species": species,
            "seed": seed,
            "file": name,
        })
        note = "  (guessed from keywords — file it in TOPIC_BY_REPO)" if guessed else ""
        if guessed:
            lines.append(f"WARN   {slug}: no topic in front matter or table, guessed {topic}{note}")
        lines.append(f"repo   {slug:<30} {species:<8} {name}")

    if review_dirs:
        for species in sorted(grow.SPECIES):
            for seed in REVIEW_SEEDS:
                target = os.path.join(review_dirs, f"{species}-{seed}.svg")
                with open(target, "w", encoding="utf-8", newline="\n") as handle:
                    handle.write(grow.grow(species, seed))

    write_manifest(topics, species_files, project_files)
    return lines


def write_manifest(topics, species_files, projects) -> None:
    out = [
        "# Generated by scripts/flora/catalogue.py — do not edit by hand.",
        "# The assignment lives in that script; re-running it rewrites this file.",
        "# A plant is <species>-<seed>.svg in assets/flora/.",
        "",
        "species:",
    ]
    for topic in topics:
        species = TOPIC_SPECIES[topic["slug"]]
        label = LABELS[species]
        blurb = BLURBS[species]
        name = species_files[topic["slug"]]
        out += [
            "  - slug: " + topic["slug"],
            "    name: " + topic["name"],
            "    species: " + species,
            "    label: " + label,
            '    blurb: "' + blurb + '"',
            "    file: /assets/flora/" + name,
        ]
    out += ["", "projects:"]
    for project in sorted(projects, key=lambda p: (p["topic"], p["slug"])):
        out += [
            "  - slug: " + project["slug"],
            '    title: "' + project["title"].replace('"', "'") + '"',
            "    topic: " + project["topic"],
            "    species: " + project["species"],
            "    label: " + LABELS[project["species"]],
            "    seed: " + str(project["seed"]),
            "    file: /assets/flora/" + project["file"],
        ]
    with open(MANIFEST, "w", encoding="utf-8", newline=chr(10)) as handle:
        handle.write(chr(10).join(out) + chr(10))


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Grow the garden and write its manifest.")
    parser.add_argument("--review", metavar="DIR", help="also write the four-seed review set here")
    args = parser.parse_args(argv)

    if args.review:
        os.makedirs(args.review, exist_ok=True)
    for line in grow_all(args.review):
        print(line)

    total = 0
    for name in sorted(os.listdir(OUT_DIR)):
        if name.endswith(".svg"):
            total += os.path.getsize(os.path.join(OUT_DIR, name))
    print(f"\n{len(os.listdir(OUT_DIR))} files, {total / 1024:.0f} KB in assets/flora")
    if total > 1_500_000:
        raise SystemExit("the garden is over its 1.5 MB budget")
    return 0


if __name__ == "__main__":
    sys.exit(main())
