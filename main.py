"""
Search Lab - Compare different search strategies side by side.

Run with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import time
import random
import io

app = FastAPI(title="Search Lab")


class SearchRequest(BaseModel):
    query: str


class SearchResult(BaseModel):
    id: str
    name: str
    description: str
    price: float
    imageUrl: str
    score: float
    category: str | None = None
    badge: str | None = None


class SearchResponse(BaseModel):
    results: list[SearchResult]
    method: str
    latency_ms: float
    transcription: str | None = None
    rewritten_query: str | None = None
    detected_features: list[str] | None = None


# Mock product data
PRODUCTS = [
    {
        "id": "001",
        "name": "Diamond Solitaire Ring",
        "description": "Classic round brilliant diamond set in 18k white gold. Timeless elegance for engagements.",
        "price": 4999.00,
        "imageUrl": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop",
        "category": "Rings",
    },
    {
        "id": "002",
        "name": "Gold Chain Necklace",
        "description": "14k yellow gold Cuban link chain. Bold statement piece for everyday wear.",
        "price": 1299.00,
        "imageUrl": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop",
        "category": "Necklaces",
    },
    {
        "id": "003",
        "name": "Pearl Drop Earrings",
        "description": "Freshwater pearls with sterling silver hooks. Elegant and sophisticated.",
        "price": 299.00,
        "imageUrl": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=400&fit=crop",
        "category": "Earrings",
    },
    {
        "id": "004",
        "name": "Silver Tennis Bracelet",
        "description": "Sterling silver with cubic zirconia stones. Sparkle for any occasion.",
        "price": 449.00,
        "imageUrl": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=400&fit=crop",
        "category": "Bracelets",
    },
    {
        "id": "005",
        "name": "Vintage Emerald Ring",
        "description": "Art deco inspired emerald ring with diamond accents in platinum setting.",
        "price": 3799.00,
        "imageUrl": "https://images.unsplash.com/photo-1551406483-3731d1997540?w=400&h=400&fit=crop",
        "category": "Rings",
        "badge": "VINTAGE",
    },
    {
        "id": "006",
        "name": "Rose Gold Pendant",
        "description": "Delicate heart-shaped pendant in 14k rose gold with diamond accent.",
        "price": 599.00,
        "imageUrl": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop",
        "category": "Necklaces",
    },
    {
        "id": "007",
        "name": "Sapphire Stud Earrings",
        "description": "Blue sapphire studs set in white gold. Deep color, brilliant sparkle.",
        "price": 899.00,
        "imageUrl": "https://images.unsplash.com/photo-1588444650733-d0b6271cfc55?w=400&h=400&fit=crop",
        "category": "Earrings",
    },
    {
        "id": "008",
        "name": "Men's Signet Ring",
        "description": "Classic gold signet ring with customizable engraving surface.",
        "price": 799.00,
        "imageUrl": "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&h=400&fit=crop",
        "category": "Rings",
    },
]


def keyword_search(query: str) -> list[dict]:
    """Simple keyword matching search."""
    query_lower = query.lower()
    keywords = query_lower.split()

    results = []
    for product in PRODUCTS:
        text = f"{product['name']} {product['description']} {product.get('category', '')}".lower()
        matches = sum(1 for kw in keywords if kw in text)
        if matches > 0:
            score = matches / len(keywords)
            results.append({**product, "score": round(score, 3)})

    return sorted(results, key=lambda x: x["score"], reverse=True)


def fuzzy_search(query: str) -> list[dict]:
    """Fuzzy matching with partial string matching."""
    query_lower = query.lower()

    results = []
    for product in PRODUCTS:
        text = f"{product['name']} {product['description']} {product.get('category', '')}".lower()

        # Simple fuzzy: check if any 3-char substring of query appears
        score = 0.0
        for i in range(len(query_lower) - 2):
            substring = query_lower[i : i + 3]
            if substring in text:
                score += 0.2

        # Boost for exact word matches
        for word in query_lower.split():
            if word in text:
                score += 0.3

        if score > 0:
            results.append({**product, "score": round(min(score, 1.0), 3)})

    return sorted(results, key=lambda x: x["score"], reverse=True)


def rewrite_query(query: str) -> str:
    """
    Mock query rewriting for semantic search.
    In production, this would use an LLM to expand/refine the query.
    """
    query_lower = query.lower()

    # Simple expansions
    expansions = {
        "ring": "ring jewelry band",
        "necklace": "necklace chain pendant jewelry",
        "earring": "earrings studs jewelry",
        "bracelet": "bracelet bangle jewelry",
        "gold": "gold yellow metal luxury",
        "silver": "silver sterling white metal",
        "diamond": "diamond brilliant sparkle luxury engagement",
        "gift": "gift present elegant romantic luxury",
        "wedding": "wedding engagement matrimony bridal",
        "vintage": "vintage antique classic retro art deco",
    }

    words = query_lower.split()
    expanded_words = set(words)

    for word in words:
        if word in expansions:
            expanded_words.update(expansions[word].split())

    return " ".join(sorted(expanded_words))


def semantic_search(query: str) -> list[dict]:
    """
    Mock semantic/vector search.
    In production, this would use embeddings and vector similarity.
    For now, we simulate with category-based matching and randomization.
    """
    query_lower = query.lower()

    # Semantic associations (mock)
    associations = {
        "engagement": ["ring", "diamond", "solitaire"],
        "wedding": ["ring", "gold", "band"],
        "gift": ["pendant", "earrings", "bracelet"],
        "luxury": ["diamond", "gold", "platinum", "emerald", "sapphire"],
        "everyday": ["chain", "stud", "simple"],
        "vintage": ["art deco", "antique", "classic"],
        "romantic": ["heart", "rose", "pendant"],
    }

    results = []
    for product in PRODUCTS:
        text = f"{product['name']} {product['description']}".lower()

        # Base score from keyword presence
        score = 0.0
        for word in query_lower.split():
            if word in text:
                score += 0.3

        # Semantic boost from associations
        for concept, related_words in associations.items():
            if concept in query_lower:
                for related in related_words:
                    if related in text:
                        score += 0.15

        # Add some randomness to simulate embedding similarity variance
        if score > 0:
            score += random.uniform(-0.1, 0.1)
            score = max(0.1, min(score, 1.0))
            results.append({**product, "score": round(score, 3)})

    return sorted(results, key=lambda x: x["score"], reverse=True)


@app.post("/api/search/keyword", response_model=SearchResponse)
async def search_keyword(request: SearchRequest):
    """Keyword-based search."""
    start = time.perf_counter()
    results = keyword_search(request.query)
    latency = (time.perf_counter() - start) * 1000

    return SearchResponse(
        results=[SearchResult(**r) for r in results],
        method="keyword",
        latency_ms=round(latency, 2),
    )


@app.post("/api/search/fuzzy", response_model=SearchResponse)
async def search_fuzzy(request: SearchRequest):
    """Fuzzy matching search."""
    start = time.perf_counter()
    # Simulate slightly more processing time
    time.sleep(random.uniform(0.01, 0.03))
    results = fuzzy_search(request.query)
    latency = (time.perf_counter() - start) * 1000

    return SearchResponse(
        results=[SearchResult(**r) for r in results],
        method="fuzzy",
        latency_ms=round(latency, 2),
    )


@app.post("/api/search/semantic", response_model=SearchResponse)
async def search_semantic(request: SearchRequest):
    """Semantic/vector search (mocked)."""
    start = time.perf_counter()
    # Simulate embedding lookup time
    time.sleep(random.uniform(0.02, 0.05))

    # Rewrite query for semantic search
    rewritten = rewrite_query(request.query)
    results = semantic_search(request.query)
    latency = (time.perf_counter() - start) * 1000

    return SearchResponse(
        results=[SearchResult(**r) for r in results],
        method="semantic",
        latency_ms=round(latency, 2),
        rewritten_query=rewritten if rewritten != request.query.lower() else None,
    )


@app.post("/api/search/all")
async def search_all(request: SearchRequest):
    """Run all search methods and return combined results."""
    start = time.perf_counter()

    keyword_results = keyword_search(request.query)
    fuzzy_results = fuzzy_search(request.query)
    semantic_results = semantic_search(request.query)

    latency = (time.perf_counter() - start) * 1000

    return {
        "keyword": {
            "results": keyword_results,
            "method": "keyword",
        },
        "fuzzy": {
            "results": fuzzy_results,
            "method": "fuzzy",
        },
        "semantic": {
            "results": semantic_results,
            "method": "semantic",
        },
        "total_latency_ms": round(latency, 2),
    }


# =============================================================================
# Audio Search Endpoints
# =============================================================================

# Mock transcription - in production, use Whisper or similar
MOCK_TRANSCRIPTIONS = [
    "diamond ring",
    "gold necklace",
    "pearl earrings",
    "silver bracelet",
    "vintage emerald",
]


def mock_transcribe_audio(audio_data: bytes) -> str:
    """Mock audio transcription. Replace with real STT in production."""
    # Simulate processing time
    time.sleep(random.uniform(0.1, 0.3))
    # Return a random mock transcription
    return random.choice(MOCK_TRANSCRIPTIONS)


@app.post("/api/search/keyword/audio", response_model=SearchResponse)
async def search_keyword_audio(audio: UploadFile = File(...)):
    """Keyword search from audio input."""
    start = time.perf_counter()

    # Read and "transcribe" audio
    audio_data = await audio.read()
    transcription = mock_transcribe_audio(audio_data)

    # Run keyword search
    results = keyword_search(transcription)
    latency = (time.perf_counter() - start) * 1000

    return SearchResponse(
        results=[SearchResult(**r) for r in results],
        method="keyword",
        latency_ms=round(latency, 2),
        transcription=transcription,
    )


@app.post("/api/search/fuzzy/audio", response_model=SearchResponse)
async def search_fuzzy_audio(audio: UploadFile = File(...)):
    """Fuzzy search from audio input."""
    start = time.perf_counter()

    audio_data = await audio.read()
    transcription = mock_transcribe_audio(audio_data)

    results = fuzzy_search(transcription)
    latency = (time.perf_counter() - start) * 1000

    return SearchResponse(
        results=[SearchResult(**r) for r in results],
        method="fuzzy",
        latency_ms=round(latency, 2),
        transcription=transcription,
    )


@app.post("/api/search/semantic/audio", response_model=SearchResponse)
async def search_semantic_audio(audio: UploadFile = File(...)):
    """Semantic search from audio input."""
    start = time.perf_counter()

    audio_data = await audio.read()
    transcription = mock_transcribe_audio(audio_data)

    results = semantic_search(transcription)
    latency = (time.perf_counter() - start) * 1000

    return SearchResponse(
        results=[SearchResult(**r) for r in results],
        method="semantic",
        latency_ms=round(latency, 2),
        transcription=transcription,
    )


# =============================================================================
# Image Search Endpoints
# =============================================================================

# Mock image analysis - in production, use CLIP or similar
def mock_analyze_image(image_data: bytes) -> list[str]:
    """Mock image analysis. Replace with real vision model in production."""
    # Simulate processing time
    time.sleep(random.uniform(0.1, 0.3))

    # Return random detected features
    features = [
        ["ring", "gold", "diamond"],
        ["necklace", "chain", "pendant"],
        ["earrings", "pearl", "elegant"],
        ["bracelet", "silver", "sparkle"],
        ["ring", "emerald", "vintage"],
    ]
    return random.choice(features)


def image_search(features: list[str]) -> list[dict]:
    """Search products based on detected image features."""
    results = []
    for product in PRODUCTS:
        text = f"{product['name']} {product['description']}".lower()

        # Score based on feature matches
        score = 0.0
        for feature in features:
            if feature.lower() in text:
                score += 0.3

        # Add some randomness
        if score > 0:
            score += random.uniform(-0.1, 0.15)
            score = max(0.1, min(score, 1.0))
            results.append({**product, "score": round(score, 3)})

    return sorted(results, key=lambda x: x["score"], reverse=True)


@app.post("/api/search/keyword/image", response_model=SearchResponse)
async def search_keyword_image(image: UploadFile = File(...)):
    """Keyword search from image input."""
    start = time.perf_counter()

    image_data = await image.read()
    features = mock_analyze_image(image_data)

    # Use features as keywords
    query = " ".join(features)
    results = keyword_search(query)
    latency = (time.perf_counter() - start) * 1000

    return SearchResponse(
        results=[SearchResult(**r) for r in results],
        method="keyword",
        latency_ms=round(latency, 2),
        detected_features=features,
    )


@app.post("/api/search/fuzzy/image", response_model=SearchResponse)
async def search_fuzzy_image(image: UploadFile = File(...)):
    """Fuzzy search from image input."""
    start = time.perf_counter()

    image_data = await image.read()
    features = mock_analyze_image(image_data)

    query = " ".join(features)
    results = fuzzy_search(query)
    latency = (time.perf_counter() - start) * 1000

    return SearchResponse(
        results=[SearchResult(**r) for r in results],
        method="fuzzy",
        latency_ms=round(latency, 2),
        detected_features=features,
    )


@app.post("/api/search/semantic/image", response_model=SearchResponse)
async def search_semantic_image(image: UploadFile = File(...)):
    """Semantic search from image input (uses image embeddings in production)."""
    start = time.perf_counter()

    image_data = await image.read()
    features = mock_analyze_image(image_data)

    # For semantic, use the image_search which simulates embedding similarity
    results = image_search(features)
    latency = (time.perf_counter() - start) * 1000

    return SearchResponse(
        results=[SearchResult(**r) for r in results],
        method="semantic",
        latency_ms=round(latency, 2),
        detected_features=features,
    )


# Serve static files in production
try:
    app.mount("/static", StaticFiles(directory="dist"), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse("dist/index.html")

except Exception:
    pass  # Static files not available in dev mode


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
