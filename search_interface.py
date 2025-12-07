"""
Search Interface - Abstract base class for implementing search systems.

Implement the SearchEngine abstract class to create your own search strategy.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Document:
    """A document in the search index."""
    id: str
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SearchResult:
    """A single search result with relevance score."""
    doc_id: str
    score: float
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SearchResponse:
    """Response from a search query."""
    results: list[SearchResult]
    query: str
    total_hits: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)


class SearchEngine(ABC):
    """
    Abstract base class for search engine implementations.

    Implement this interface to create your own search strategy.

    Example:
        class MySearch(SearchEngine):
            def __init__(self):
                self._docs = {}

            def index(self, documents: list[Document]) -> None:
                for doc in documents:
                    self._docs[doc.id] = doc

            def search(self, query: str, top_k: int = 10) -> SearchResponse:
                # Your search logic here
                ...

            def delete(self, doc_ids: list[str]) -> int:
                deleted = 0
                for doc_id in doc_ids:
                    if doc_id in self._docs:
                        del self._docs[doc_id]
                        deleted += 1
                return deleted

            def clear(self) -> None:
                self._docs.clear()
    """

    @abstractmethod
    def index(self, documents: list[Document]) -> None:
        """
        Index documents for searching.

        Args:
            documents: List of documents to index.
        """
        pass

    @abstractmethod
    def search(self, query: str, top_k: int = 10) -> SearchResponse:
        """
        Search for documents matching the query.

        Args:
            query: The search query string.
            top_k: Maximum number of results to return.

        Returns:
            SearchResponse containing ranked results.
        """
        pass

    @abstractmethod
    def delete(self, doc_ids: list[str]) -> int:
        """
        Delete documents from the index.

        Args:
            doc_ids: List of document IDs to delete.

        Returns:
            Number of documents actually deleted.
        """
        pass

    @abstractmethod
    def clear(self) -> None:
        """Clear all documents from the index."""
        pass


class VectorSearchEngine(SearchEngine):
    """
    Extended interface for vector/embedding-based search.

    Adds methods for working with embeddings directly.
    """

    @abstractmethod
    def embed(self, text: str) -> list[float]:
        """
        Generate embedding vector for text.

        Args:
            text: Text to embed.

        Returns:
            Embedding vector as list of floats.
        """
        pass

    @abstractmethod
    def search_by_vector(self, vector: list[float], top_k: int = 10) -> SearchResponse:
        """
        Search using a pre-computed embedding vector.

        Args:
            vector: Query embedding vector.
            top_k: Maximum number of results to return.

        Returns:
            SearchResponse containing ranked results.
        """
        pass
