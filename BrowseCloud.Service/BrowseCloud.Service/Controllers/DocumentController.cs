// <copyright file="DocumentController.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Controllers
{
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Common.Helpers;
    using BrowseCloud.Service.Models;
    using BrowseCloud.Service.Models.Configurations;
    using BrowseCloud.Service.Models.Exceptions;
    using BrowseCloud.Service.Models.Extensions;
    using BrowseCloud.Service.Services.AzureBatch;
    using BrowseCloud.Service.Services.AzureStorage;
    using BrowseCloud.Service.Services.DocumentDb;
    using BrowseCloud.Service.Services.Graph;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Options;

    /// <summary>
    /// Controller for Documents.
    /// </summary>
    [Authorize]
    [Route("api/v1/documents")]
    [ApiController]
    public class DocumentController : BrowseCloudControllerBase
    {
        /// <summary>
        /// Azure Storage Service - Dependency Injected.
        /// </summary>
        private readonly IStorageService storageService;

        /// <summary>
        /// Azure Cosmos DB Service - Dependency Injected.
        /// </summary>
        private readonly IDocumentDbService documentDbService;

        /// <summary>
        /// Azure Batch Service - Dependency Injected.
        /// </summary>
        private readonly IBatchService batchService;

        /// <summary>
        /// Graph Service - Dependency Injected.
        /// </summary>
        private readonly IGraphService graphService;

        /// <summary>
        /// Initializes a new instance of the <see cref="DocumentController"/> class.
        /// </summary>
        /// <param name="storageService">Azure Storage Location</param>
        /// <param name="docDbService">Document DB Service</param>
        /// <param name="batchService">Azure Batch</param>
        /// <param name="graphService">Graph Service</param>
        /// <param name="logger">Logger</param>
        /// <param name="config">General Config</param>
        public DocumentController(
            IStorageService storageService,
            IDocumentDbService docDbService,
            IBatchService batchService,
            IGraphService graphService,
            ILogger<DocumentController> logger,
            IOptions<GeneralConfig> config)
            : base(logger, config)
        {
            this.storageService = storageService;
            this.documentDbService = docDbService;
            this.batchService = batchService;
            this.graphService = graphService;
        }

        /// <summary>
        /// Get all documents current user can access.
        /// </summary>
        /// <url>http://localhost/api/v1/documents</url>
        /// <verb>GET</verb>
        /// <response code="200"><see cref="List{T}"/> where T is <see cref="Document"/>A list of documents the current user can access.</response>
        [HttpGet]
        [Route("")]
        public async Task<IEnumerable<Document>> Get()
        {
            var idsToSearch = await this.graphService.GetAllCurrentUserIdentities();
            return await DocumentHelper.GetAllAccessibleDocuments(idsToSearch, this.documentDbService);
        }

        /// <summary>
        /// Get all public documents that all Microsoft can access.
        /// </summary>
        /// <url>http://localhost/api/v1/documents/public</url>
        /// <verb>GET</verb>
        /// <response code="200"><see cref="List{T}"/> where T is <see cref="Document"/>A list of all public documents.</response>
        [HttpGet]
        [Route("public")]
        public async Task<IEnumerable<Document>> GetPublic()
        {
            return await this.documentDbService.GetDocuments<Document>((doc) => doc.IsPublic == true);
        }

        /// <summary>
        /// Gets a single document entity by ID.
        /// </summary>
        /// <url>http://localhost/api/v1/documents/{id}</url>
        /// <verb>GET</verb>
        /// <param name="id">Document ID</param>
        /// <response code="200"><see cref="Document"/>The selected document.</response>
        [HttpGet]
        [Route("{id}")]
        public async Task<Document> Get(string id)
        {
            return await this.GetDocumentIfValidAndAuthed(id, false);
        }

        /// <summary>
        /// Gets a list of jobs belonging to the selected document.
        /// </summary>
        /// <url>http://localhost/api/v1/documents/{id}/jobs</url>
        /// <verb>GET</verb>
        /// <param name="id">Document ID</param>
        /// <response code="200"><see cref="List{T}"/> where T is <see cref="BatchJob"/>List of jobs belonging to the document.</response>
        [HttpGet]
        [Route("{id}/jobs")]
        public async Task<IEnumerable<BatchJob>> GetJobs(string id)
        {
            var doc = await this.GetDocumentIfValidAndAuthed(id, false);
            return await this.documentDbService.GetDocuments<BatchJob>((j) => j.DocumentId == doc.Id);
        }

        /// <summary>
        /// Gets the input text of the current document.
        /// </summary>
        /// <url>http://localhost/api/v1/documents/{id}/text</url>
        /// <verb>GET</verb>
        /// <param name="id">Document ID.</param>
        /// <response code="200"><see cref="string"/>The uploaded document text along with some metadata.</response>
        [HttpGet]
        [Route("{id}/text")]
        public async Task<ContentResult> GetText(string id)
        {
            var doc = await this.GetDocumentIfValidAndAuthed(id, false);

            var docText = await DocumentHelper.GetDocumentInputText(doc, this.storageService);

            return new ContentResult
            {
                Content = docText,
                ContentType = "text/plain",
                StatusCode = 200,
            };
        }

        /// <summary>
        /// Accepts a new document text in the body and creates a new document based on that.
        /// </summary>
        /// <url>http://localhost/api/v1/documents</url>
        /// <verb>POST</verb>
        /// <param name="documentText" in="body"><see cref="string"/>The text of the input file.</param>
        /// <response code="200"><see cref="Document"/>A newly created Document entity.</response>
        [HttpPost]
        [Route("")]
        public async Task<Document> Post([FromBody] string documentText)
        {
            if (documentText == null || documentText?.Length == 0)
            {
                throw new BrowseCloudValidationException("There is no text/plain file in the body.");
            }

            var inputProcessingTuple = DocumentHelper.PrepareInputText(documentText);
            var inputType = inputProcessingTuple.Item1;
            documentText = inputProcessingTuple.Item2;

            // Fill out user identity.
            var user = await this.graphService.GetUser(this.User.Identity.Name);
            var userIdentity = new DirectoryIdentity
            {
                Id = user.Id,
                PrincipalName = this.User.Identity.Name,
                DisplayName = user.DisplayName,
                Type = DirectoryIdentityType.User,
            };

            // Create Document.
            var document = new Document(inputType, userIdentity);

            this.logger.LogInformation($"Created document {document.Id.ToString()}.");
            await DocumentHelper.UploadDocumentAndResources(documentText, document, this.storageService, this.documentDbService, this.logger);
            this.logger.LogInformation($"Uploaded input file and entity for document {document.Id.ToString()}.");

            // Kick off the first job for free.
            await JobHelper.MakeBatchJob(document, this.config.CommandPrefix ?? string.Empty, this.documentDbService, this.batchService, this.logger);
            this.logger.LogInformation($"Created a batch job for document {document.Id.ToString()}.");

            return document;
        }

        /// <summary>
        /// Accepts a new document text to test to see if it is valid.
        /// </summary>
        /// <url>http://localhost/api/v1/documents/validateInput</url>
        /// <verb>POST</verb>
        /// <param name="documentText" in="body"><see cref="string"/>The text of the input file.</param>
        /// <response code="200">A string expressing the type of the document.</response>
        [HttpPost]
        [Route("validateInput")]
        public FileValidationResponse ValidateDocumentText([FromBody] string documentText)
        {
            if (documentText == null || documentText?.Length == 0)
            {
                throw new BrowseCloudValidationException("There is no text/plain file in the body.");
            }

            FileValidationResponse response;
            try
            {
                var inputType = DocumentHelper.PrepareInputText(documentText).Item1;
                response = new FileValidationResponse
                {
                    Message = $"Valid {inputType.ToString()} file.",
                    IsValid = true,
                };
            }
            catch (BrowseCloudValidationException ex)
            {
                response = new FileValidationResponse
                {
                    Message = ex.Message,
                    IsValid = false
                };
            }

            return response;
        }

        /// <summary>
        /// Update some properties of the document.
        /// </summary>
        /// <url>http://localhost/api/v1/documents/{id}</url>
        /// <verb>PUT</verb>
        /// <param name="id">Document ID</param>
        /// <param name="doc" in="body"><see cref="Document"/>The updated document entity.</param>
        /// <response code="200"><see cref="Document"/>The edited document.</response>
        [HttpPut]
        [Route("{id}")]
        public async Task<Document> Put(string id, [FromBody] Document doc)
        {
            if (doc == null)
            {
                throw new BrowseCloudValidationException("You must include a valid Document in the body of the request.");
            }

            var oldDoc = await this.GetDocumentIfValidAndAuthed(id, true);

            doc = await DocumentHelper.ValidateUsersAndGroups(oldDoc, doc, this.graphService);

            var replaceDoc = new Document
            {
                Id = new Guid(id),
                DisplayName = doc.DisplayName,
                Description = doc.Description,
                Acl = doc.Acl,
                IsPublic = doc.IsPublic,
                InputType = oldDoc.InputType,
                Owner = doc.Owner,
                SubmitDateTime = oldDoc.SubmitDateTime,
                UpdateDateTime = DateTime.UtcNow,
            };

            await this.documentDbService.UpsertDocument(replaceDoc);
            return replaceDoc;
        }

        /// <summary>
        /// Deletes a selected document and all related jobs, storage containers.
        /// </summary>
        /// <url>http://localhost/api/v1/documents/{id}</url>
        /// <verb>DELETE</verb>
        /// <param name="id">Document ID.</param>
        /// <returns>No content.</returns>
        [HttpDelete]
        [Route("{id}")]
        public async Task Delete(string id)
        {
            var doc = await this.GetDocumentIfValidAndAuthed(id, true);
            var jobs = await this.documentDbService.GetDocuments<BatchJob>((j) => j.DocumentId == doc.Id);

            await JobHelper.DeleteJobsAndResourcesFromDoc(doc, this.documentDbService, this.storageService, this.batchService, this.logger);
            this.logger.LogInformation($"Deleted Jobs and Resources for document {id}.");
            await DocumentHelper.DeleteDocumentAndResources(doc, this.storageService, this.documentDbService, this.logger);
            this.logger.LogInformation($"Deleted Document and Resources for document {id}.");
        }

        /// <summary>
        /// Handles getting a single document and throwing errors if something is off
        /// such as invalid guid, no document, unauthed.
        /// </summary>
        /// <param name="id">Document ID.</param>
        /// <param name="writePermissions">Whether write permissions are needed or not.</param>
        /// <returns>Document entity</returns>
        private async Task<Document> GetDocumentIfValidAndAuthed(string id, bool writePermissions)
        {
            var isGuid = Guid.TryParse(id, out var guidResult);

            if (!isGuid)
            {
                throw new BrowseCloudValidationException($"There is no guid in the url that could represent a document. '{id}' is not a guid.");
            }

            var doc = await this.documentDbService.GetDocument<Document>(id);

            if (doc == null)
            {
                this.logger.LogError($"Document {id} cannot be found when requested.");
                throw new BrowseCloudPageNotFoundException($"Document {id} cannot be found.");
            }

            var idsToSearch = await this.graphService.GetAllCurrentUserIdentities();

            if (!doc.UserCanRead(idsToSearch))
            {
                this.logger.LogError($"Document {id} was requested, but not returned because the user did not have permission.");
                throw new BrowseCloudPermissionsDeniedException($"You do not have permission to access document {id}");
            }

            if (writePermissions == true && !doc.UserCanModify(idsToSearch))
            {
                this.logger.LogError($"Document {id} was requested for write, but not returned because the user did not have permission to write.");
                throw new BrowseCloudPermissionsDeniedException($"You do not have permission to write to document {id}");
            }

            return doc;
        }
    }
}
