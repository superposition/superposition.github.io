---
layout: default
title: Repositories
permalink: /projects/
description: The twenty repositories worth a page of their own, and every other public repository.
---
{% assign repos = site.repos | sort: "order" %}
<header class="page-heading wide">
  <h1>Repositories</h1>
  <p class="lede">Twenty of the repositories, one page each: what it is, what it does, and how it is built. Every other public repository follows at the end.</p>
</header>
<div class="wide">
  {% if repos.size > 0 %}
  <ul class="repo-grid">
    {% for item in repos %}
    <li class="repo-card">
      <a href="{{ item.url | relative_url }}">
        {% if item.image %}<img src="{{ item.image | relative_url }}" alt="" width="600" height="375" loading="lazy">{% endif %}
        <span class="repo-name">{{ item.title | default: item.slug }}</span>
        {% if item.tagline %}<span class="repo-tagline">{{ item.tagline }}</span>{% endif %}
        <span class="repo-meta">{% if item.language %}{{ item.language }}{% endif %}{% if item.stars %} · {{ item.stars }} star{% if item.stars != 1 %}s{% endif %}{% endif %}</span>
      </a>
    </li>
    {% endfor %}
  </ul>
  {% else %}
  <p class="empty">The repository pages are being written. Until they land, every public repository is listed below.</p>
  {% endif %}

  <section class="repo-index" aria-labelledby="all-repos">
    <h2 id="all-repos" class="section-title">Every public repository</h2>
    <p class="repo-count">{{ site.data.repos.repos | size }} repositories, newest push first.</p>
    {%- for repo in site.data.repos.repos %}
    <p class="repo-line"><a href="{{ repo.url }}"><strong>{{ repo.name | escape }}</strong></a> — {{ repo.description | escape }}<br><small>{% if repo.language %}{{ repo.language | escape }} · {% endif %}{% if repo.stars > 0 %}{{ repo.stars }} star{% if repo.stars != 1 %}s{% endif %} · {% endif %}pushed <time datetime="{{ repo.pushed }}">{{ repo.pushed }}</time></small></p>
    {%- endfor %}
  </section>
</div>
{% include jsonld.html %}
