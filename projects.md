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
  <section class="band" aria-labelledby="pages-title">
    <h2 id="pages-title" class="section-title">A page each <span class="count">{{ repos.size }}</span></h2>
    <div class="band-body">
      {% if repos.size > 0 %}
      <ul class="repo-grid">
        {% for item in repos %}
        <li>
          <a class="card" href="{{ item.url | relative_url }}">
            {% if item.image %}<span class="card-media"><img src="{{ item.image | relative_url }}" alt="" width="600" height="375" loading="lazy"></span>{% endif %}
            <span class="card-kicker">{% if forloop.index < 10 %}0{% endif %}{{ forloop.index }}</span>
            <span class="card-title">{{ item.title | default: item.slug }}</span>
            {% if item.tagline %}<span class="card-text">{{ item.tagline }}</span>{% endif %}
            <span class="card-meta">{% if item.language %}{{ item.language }}{% endif %}{% if item.stars %} · {{ item.stars }} star{% if item.stars != 1 %}s{% endif %}{% endif %}</span>
          </a>
        </li>
        {% endfor %}
      </ul>
      {% else %}
      <div class="empty-state">
        <p class="empty-title">No repository pages yet</p>
        <p class="empty-text">They are being written. Until they land, every public repository is listed below.</p>
      </div>
      {% endif %}
    </div>
  </section>

  <section class="band" id="all" aria-labelledby="all-repos">
    <h2 id="all-repos" class="section-title">Every public repository <span class="count">{{ site.data.repos.repos | size }}</span></h2>
    <div class="band-body">
      <p class="repo-count">Newest push first.</p>
      <div class="repo-all">
        {%- for repo in site.data.repos.repos %}
        <p class="repo-line"><a href="{{ repo.url }}"><strong>{{ repo.name | escape }}</strong></a> — {{ repo.description | escape }}<br><small>{% if repo.language %}{{ repo.language | escape }} · {% endif %}{% if repo.stars > 0 %}{{ repo.stars }} star{% if repo.stars != 1 %}s{% endif %} · {% endif %}pushed <time datetime="{{ repo.pushed }}">{{ repo.pushed }}</time></small></p>
        {%- endfor %}
      </div>
    </div>
  </section>
</div>
{% include jsonld.html %}
