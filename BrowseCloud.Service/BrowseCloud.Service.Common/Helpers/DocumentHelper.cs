// <copyright file="DocumentHelper.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Common.Helpers
{
    using System;
    using System.Collections.Generic;
    using System.Diagnostics.Contracts;
    using System.IO;
    using System.Linq;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Models;
    using BrowseCloud.Service.Models.Exceptions;
    using BrowseCloud.Service.Models.Extensions;
    using BrowseCloud.Service.Services.AzureStorage;
    using BrowseCloud.Service.Services.DocumentDb;
    using BrowseCloud.Service.Services.Graph;
    using GenericParsing;
    using Microsoft.Extensions.Logging;

    /// <summary>
    /// Helper Methods for the Document Controller and dealing with Document entities.
    /// </summary>
    public static class DocumentHelper
    {
        /// <summary>
        /// Format and validate input text.
        /// </summary>
        /// <param name="documentText">The text of the document to be uploaded to document blob.</param>
        /// <returns></returns>
        public static Tuple<InputType, string> PrepareInputText(string documentText)
        {
            if (string.IsNullOrWhiteSpace(documentText))
            {
                throw new BrowseCloudValidationException($"The file must exist.");
            }

            documentText = documentText.Trim();

            if (!IsValidDocumentLength(documentText, true))
            {
                throw new BrowseCloudValidationException($"The file needs to have between 1000 and 20000 rows.");
            }

            InputType inputType;

            if (ValidateMetadataInput(documentText))
            {
                inputType = InputType.MetadataInput;
            }
            else
            {
                try
                {
                    var simpleInputText = MakeSimpleInput(documentText);
                    inputType = InputType.SimpleInput;
                    documentText = simpleInputText;
                }
                catch (Exception ex)
                {
                    throw new BrowseCloudValidationException(ex.Message);
                }
            }

            return new Tuple<InputType, string>(inputType, documentText);
        }

        /// <summary>
        /// Uploads Blob and Document entity.
        /// </summary>
        /// <param name="documentText">The string representing the input text.</param>
        /// <param name="document">Document entity.</param>
        /// <param name="storageService">IStorageService.</param>
        /// <param name="docDbService">IDocDbService.</param>
        /// <param name="logger">Logger.</param>
        /// <returns></returns>
        public static async Task UploadDocumentAndResources(string documentText, Document document, IStorageService storageService, IDocumentDbService docDbService, ILogger logger)
        {
            Contract.Requires(storageService != null, nameof(storageService));
            Contract.Requires(docDbService != null, nameof(docDbService));

            if (string.IsNullOrWhiteSpace(documentText))
            {
                throw new BrowseCloudValidationException("Cannot store a document with no text.");
            }

            if (document == null)
            {
                throw new BrowseCloudValidationException("Cannot store an empty document entity.");
            }

            var nameOfDocument = document.BlobFileName();
            await RetryHelper.RetryTask(storageService.UploadTextFileToBlob(StorageAccount.Training, documentText, document.Id.ToString(), nameOfDocument));
            logger.LogInformation($"Uploaded input file for document {document.Id.ToString()}.");
            await RetryHelper.RetryTask(docDbService.UpsertDocument(document));
            logger.LogInformation($"Uploaded DocumentDB entity for document {document.Id.ToString()}.");
        }

        /// <summary>
        /// Recreates All DirectoryEntities based on Graph data.
        /// </summary>
        /// <param name="oldDoc">Old doc for performance and comparison.</param>
        /// <param name="newDoc">The new doc just received by the service.</param>
        /// <param name="graphService">IGraphService.</param>
        /// <returns></returns>
        public static async Task<Document> ValidateUsersAndGroups(Document oldDoc, Document newDoc, IGraphService graphService)
        {
            Contract.Requires(oldDoc != null, nameof(oldDoc));
            Contract.Requires(newDoc != null, nameof(newDoc));
            Contract.Requires(graphService != null, nameof(graphService));

            if (!oldDoc.Owner.EqualsDirectoryIdentity(newDoc.Owner))
            {
                newDoc.Owner = await graphService.GetDirectoryIdentity(newDoc.Owner.Id);
            }

            var aclIds = newDoc.Acl.Select((identity) => identity.Id);

            newDoc.Acl = await graphService.GetDirectoryIdentities(aclIds);

            return newDoc;
        }

        /// <summary>
        /// Deletes Blob and Document entity.
        /// </summary>
        /// <param name="document">Document entity to delete.</param>
        /// <param name="storageService">IStorageService.</param>
        /// <param name="docDbService">IDocDbService.</param>
        /// <param name="logger">Logger.</param>
        /// <returns></returns>
        public static async Task DeleteDocumentAndResources(Document document, IStorageService storageService, IDocumentDbService docDbService, ILogger logger)
        {
            Contract.Requires(storageService != null, nameof(storageService));
            Contract.Requires(docDbService != null, nameof(docDbService));

            if (document == null)
            {
                throw new BrowseCloudServiceException("Cannot delete a null document.");
            }

            await RetryHelper.RetryTask(storageService.DeleteContainer(StorageAccount.Training, document.Id.ToString()));
            logger.LogInformation($"Deleted training data container for document {document.Id.ToString()}.");
            await RetryHelper.RetryTask(docDbService.DeleteDocument<Document>(document.Id.ToString()));
            logger.LogInformation($"Deleted DocumentDB entity for document {document.Id.ToString()}.");
        }

        /// <summary>
        /// Gets all documents the current user has access to, based on a list of identities.
        /// </summary>
        /// <param name="idsToSearch">List of identities to search documents for.</param>
        /// <param name="documentDbService">IDocumentDbService.</param>
        /// <returns></returns>
        public static async Task<IEnumerable<Document>> GetAllAccessibleDocuments(IEnumerable<string> idsToSearch, IDocumentDbService documentDbService)
        {
            Contract.Requires(documentDbService != null, nameof(documentDbService));

            return await documentDbService.GetDocuments<Document>((doc) => idsToSearch.Contains(doc.Owner.Id) || doc.Acl.Any((u) => idsToSearch.Contains(u.Id)));
        }

        /// <summary>
        /// Gets the text for the input document.
        /// </summary>
        /// <param name="document">Document entity.</param>
        /// <param name="storageService">IStorageService.</param>
        /// <returns></returns>
        public static async Task<string> GetDocumentInputText(Document document, IStorageService storageService)
        {
            Contract.Requires(storageService != null, nameof(storageService));

            if (document == null)
            {
                throw new BrowseCloudServiceException("Cannot get text for a null document.");
            }

            var nameOfDocument = document.BlobFileName();
            return await RetryHelper.RetryTask(storageService.GetStringFromBlob(StorageAccount.Training, document.Id.ToString(), nameOfDocument));
        }

        /// <summary>
        /// To guarantee good output and decent training time, document lengths should be between 1000 and 20,000.
        /// </summary>
        /// <param name="documentText">document input text.</param>
        /// <param name="hasTitle">If the first row is column titles</param>
        /// <returns></returns>
        private static bool IsValidDocumentLength(string documentText, bool hasTitle)
        {
            var lines = documentText.Split(new string[] { "\r\n", "\n", "\r" }, StringSplitOptions.None);
            int minLineCount = 1000 + Convert.ToInt32(hasTitle);
            int maxLineCount = 20000 + Convert.ToInt32(hasTitle);
            return (lines.Length >= minLineCount) && (lines.Length <= maxLineCount);
        }

        /// <summary>
        /// Tests if the document is a valid simpleInput document.
        /// </summary>
        /// <param name="documentText">Document input text.</param>
        /// <returns></returns>
        private static string MakeSimpleInput(string documentText)
        {
            var rowList = new List<string>();

            using (GenericParser parser = new GenericParser(new StringReader(documentText)))
            {
                // NEVER have buffer issues!
                parser.MaxBufferSize = int.MaxValue / 4;

                if (documentText.Contains('\t', StringComparison.InvariantCulture))
                {
                    parser.ColumnDelimiter = '\t';
                }

                parser.TrimResults = true;

                while (parser.Read())
                {
                    if (parser.ColumnCount > 3 || parser.ColumnCount < 1)
                    {
                        throw new FormatException($"Row {parser.DataRowNumber} has {parser.ColumnCount} columns. It needs to have between 1 and 3 columns.");
                    }

                    if (!string.IsNullOrWhiteSpace(parser[2]) && !(parser[2].StartsWith("https://", StringComparison.InvariantCultureIgnoreCase) || parser[2].StartsWith("http://", StringComparison.InvariantCultureIgnoreCase)))
                    {
                        throw new FormatException($"Row {parser.DataRowNumber} has a third column that is not formatted like a url.");
                    }

                    var rowZero = parser[0].Replace('"', '\'').Replace('\t', ' ').Replace('\n', ' ').Replace('\r', ' ');
                    var rowOne = parser[1]?.Replace('"', '\'').Replace('\t', ' ').Replace('\n', ' ').Replace('\r', ' ') ?? string.Empty;
                    var rowTwo = parser[2]?.Replace('"', '\'').Replace('\t', ' ').Replace('\n', ' ').Replace('\r', ' ') ?? string.Empty;

                    rowList.Add(string.Join('\t', new List<string> { $"\"{rowZero}\"", $"\"{rowOne}\"", $"\"{rowTwo}\"" }));
                }
            }

            return string.Join(Environment.NewLine, rowList);
        }

        /// <summary>
        /// Tests if the document is a valid traditionalInput document.
        /// </summary>
        /// <param name="documentText">Document input text.</param>
        /// <returns></returns>
        private static bool ValidateMetadataInput(string documentText)
        {
            Contract.Requires(documentText != null, nameof(documentText));

            // Determine if first row has title or abstract, and if so, its likely trying to be a metadatainput
            // Throw errors.
            var firstLineLength = Math.Max(new[] { documentText.IndexOf("\r\n", StringComparison.InvariantCulture), documentText.IndexOf('\n', StringComparison.InvariantCulture), documentText.IndexOf('\r', StringComparison.InvariantCulture) }.Min(), 0);
            var firstLine = documentText.Substring(0, firstLineLength);
            var titles = firstLine.Split(new char[] { ',', '\t' }).Select((title) => title.Trim().Trim('"').ToUpperInvariant());
            var throwErrors = titles.Contains("TITLE") || titles.Contains("ABSTRACT");

            try
            {
                using (GenericParser parser = new GenericParser(new StringReader(documentText)))
                {
                    // NEVER have buffer issues!
                    parser.MaxBufferSize = int.MaxValue / 4;

                    parser.FirstRowHasHeader = true;

                    if (documentText.Contains('\t', StringComparison.InvariantCulture))
                    {
                        parser.ColumnDelimiter = '\t';
                    }

                    parser.TrimResults = true;

                    while (parser.Read())
                    {
                        if (string.IsNullOrWhiteSpace(parser["title"]) && string.IsNullOrWhiteSpace(parser["abstract"]))
                        {
                            throw new FormatException($"Row {parser.DataRowNumber} must contain at least a title or abstract field.");
                        }

                        if (!string.IsNullOrWhiteSpace(parser["link"]) && !(parser["link"].StartsWith("https://", StringComparison.InvariantCultureIgnoreCase) || parser["link"].StartsWith("http://", StringComparison.InvariantCultureIgnoreCase)))
                        {
                            throw new FormatException($"Row {parser.DataRowNumber} has a link that is not formatted like a url.");
                        }
                    }
                }

                return true;
            }
            catch (Exception ex)
            {
                if (throwErrors == true)
                {
                    throw new BrowseCloudValidationException(ex.Message);
                }

                return false;
            }
        }
    }
}
