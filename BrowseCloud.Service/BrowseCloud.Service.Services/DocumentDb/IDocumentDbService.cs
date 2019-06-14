// <copyright file="IDocumentDbService.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Services.DocumentDb
{
    using System;
    using System.Collections.Generic;
    using System.Linq.Expressions;
    using System.Threading.Tasks;

    /// <summary>
    /// Handles requests to the Azure Cosmos DocDb
    /// </summary>
    public interface IDocumentDbService
    {
        /// <summary>
        /// Inserts or updates a document in DocDb
        /// </summary>
        /// <typeparam name="T">Type of the document to upsert.</typeparam>
        /// <param name="document">Document to upsert</param>
        Task UpsertDocument<T>(T document);

        /// <summary>
        /// Gets a document by id from the DocDb
        /// </summary>
        /// <typeparam name="T">Type of the document to get.</typeparam>
        /// <param name="id">Id of the document to get.</param>
        /// <param name="partitionKey">Document DB partition key</param>
        /// <returns></returns>
        Task<T> GetDocument<T>(string id, string partitionKey = null);

        /// <summary>
        /// Deletes a document by id from the DocDb
        /// </summary>
        /// <typeparam name="T">Type of the document to delete.</typeparam>
        /// <param name="id">Id of the document to delete.</param>
        /// <param name="partitionKey">Document DB partition key</param>
        /// <returns>
        /// True if deleted, false if document not found
        /// </returns>
        Task<bool> DeleteDocument<T>(string id, string partitionKey = null);

        /// <summary>
        /// Gets a collection of documents based on a LINQ WHERE clause predicate
        /// </summary>
        /// <typeparam name="T">Type of the document to delete.</typeparam>
        /// <param name="predicate">
        /// A callback that returns true or false signifying if the passed document should be returned.
        /// </param>
        Task<IEnumerable<T>> GetDocuments<T>(Expression<Func<T, bool>> predicate);
    }
}
