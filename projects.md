---
layout: page
title: Repositories
permalink: /projects/
description: Public repositories pushed in the last year, newest first.
---

<p class="issue-number">{{ site.data.repos.repos | size }} repositories</p>
<p>Newest first, with language, stars, and the date of the last push. Every public repository, forks included, is on <a href="https://github.com/superposition?tab=repositories">GitHub ↗</a>; <a href="https://superposition.github.io/mage/">Mage</a> keeps its own field notes.</p>
{%- for repo in site.data.repos.repos %}
<p><a href="{{ repo.url }}"><strong>{{ repo.name | escape }}</strong></a> — {{ repo.description | escape }}<br><small>{% if repo.language %}{{ repo.language | escape }} · {% endif %}{% if repo.stars > 0 %}{{ repo.stars }} star{% if repo.stars != 1 %}s{% endif %} · {% endif %}pushed <time datetime="{{ repo.pushed }}">{{ repo.pushed }}</time></small></p>
{%- endfor %}
{% include jsonld.html %}

