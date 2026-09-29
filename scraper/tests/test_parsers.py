from app.adapters.generic_career import parse_listings
from app.adapters.indeed import parse_results
from app.enricher import extract_text
from app.models import ScrapeRequest

CAREERS_HTML = """
<html><body>
  <nav><a href="/careers">Careers</a><a href="/benefits">Benefits</a></nav>
  <a href="/jobs/123-senior-backend-engineer">Senior Backend Engineer</a>
  <a href="/jobs/123-senior-backend-engineer#apply">Senior Backend Engineer</a>
  <a href="https://boards.greenhouse.io/acme/jobs/456">Data Analyst</a>
  <a href="/about">About us</a>
</body></html>
"""


def test_generic_career_extracts_postings_and_skips_nav_and_dupes():
    req = ScrapeRequest(adapter_type="generic_career", extra={"careers_url": "https://acme.com/careers"})
    postings = parse_listings(CAREERS_HTML, "https://acme.com/careers", req)

    assert [p.title for p in postings] == ["Senior Backend Engineer", "Data Analyst"]
    assert postings[0].url == "https://acme.com/jobs/123-senior-backend-engineer"
    assert postings[0].company == "Acme"


def test_generic_career_query_filters_titles():
    req = ScrapeRequest(adapter_type="generic_career", query="backend")
    postings = parse_listings(CAREERS_HTML, "https://acme.com/careers", req)
    assert [p.title for p in postings] == ["Senior Backend Engineer"]


INDEED_HTML = """
<div class="job_seen_beacon">
  <h2 class="jobTitle"><a href="/rc/clk?jk=abc">Python Developer</a></h2>
  <span data-testid="company-name">Globex</span>
  <div data-testid="text-location">Remote</div>
</div>
"""


def test_indeed_parses_cards():
    req = ScrapeRequest(adapter_type="indeed", query="python")
    [p] = parse_results(INDEED_HTML, "www.indeed.com", req)
    assert p.title == "Python Developer"
    assert p.company == "Globex"
    assert p.location == "Remote"
    assert p.url == "https://www.indeed.com/rc/clk?jk=abc"


def test_extract_text_prefers_main_and_drops_chrome():
    html = "<body><nav>Menu</nav><main><h1>Role</h1><p>5+ years Python</p></main><footer>x</footer></body>"
    assert extract_text(html) == "Role 5+ years Python"
