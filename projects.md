---
layout: default
title: Repositories
permalink: /projects/
description: Nineteen repositories worth a page of their own, and every other public repository.
---
{% assign repos = site.repos | sort: "order" %}
<header class="page-heading wide">
  <h1>Repositories</h1>
  <p class="lede">Nineteen of the repositories, one page each: what it is, what it does, and how it is built. Every other public repository follows at the end.</p>
</header>
<div class="wide">
  {% if repos.size > 0 %}
  <ul class="repo-grid">
    {% for item in repos %}
    <li>
      <a class="card" href="{{ item.url | relative_url }}">
        {% if item.image %}<span class="card-media"><img src="{{ item.image | relative_url }}" alt="" width="600" height="375" loading="lazy"></span>{% endif %}
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

  <section class="repo-index" aria-labelledby="all-repos">
    <h2 id="all-repos" class="section-title">Every public repository</h2>
    <p class="repo-count">{{ site.data.repos.repos | size }} repositories, newest push first.</p>
    <table class="table table--compact">
      <caption>Every public repository on github.com/superposition, newest push first</caption>
      <thead>
        <tr>
          <th scope="col">Repository</th>
          <th scope="col">Language</th>
          <th scope="col" class="num">Stars</th>
          <th scope="col" class="nowrap">Last push</th>
        </tr>
      </thead>
      <tbody>
      {%- for repo in site.data.repos.repos %}
        <tr>
          <td><a href="{{ repo.url }}">{{ repo.name | escape }}</a><span class="table-note">{{ repo.description | escape }}</span></td>
          <td class="nowrap">{% if repo.language %}{{ repo.language | escape }}{% else %}—{% endif %}</td>
          <td class="num">{{ repo.stars }}</td>
          <td class="nowrap"><time datetime="{{ repo.pushed }}">{{ repo.pushed }}</time></td>
        </tr>
      {%- endfor %}
      </tbody>
    </table>
  </section>
</div>
{% include jsonld.html %}
