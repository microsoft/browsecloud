# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

from jobStatus import JobStatus
import threading
import requests


class CountingGridsHeartBeater():
    def __init__(self, url, batchJob, bcServiceAuthorizer):
        self.url = url
        self.batchJob = batchJob
        self.bcServiceAuthorizer = bcServiceAuthorizer
        self.RESET_PROGRESS_NUMBER = 0
        self.FINISHED_PROGRESS_NUMBER = 100

    def workerFactory(self, batchJob, bcServiceAuthorizer):
        url = self.url

        def worker():
            data = batchJob.__dict__
            if url != '':
                headers = {'Content-Type': "application/json", 'Accept': "application/json",
                           'Authorization': self.bcServiceAuthorizer.authOutput()}
                res = requests.put(self.url, json=data, headers=headers)
                print(res)
                print(res.text)
            else:
                print("Faking heartbeat with following batchJob:")
                print(data)

        return worker

    def beat(self):
        t = threading.Thread(target=self.workerFactory(
            self.batchJob, self.bcServiceAuthorizer), args=())
        t.setDaemon(False)
        t.start()

    def next(self):
        self.batchJob.next()
        self.batchJob.makeProgress(self.RESET_PROGRESS_NUMBER)
        self.beat()

    def makeProgress(self, progress: int):
        self.batchJob.makeProgress(progress)
        self.beat()

    def done(self, success: bool):
        if success:
            self.batchJob.jobStatus = JobStatus.Success
        else:
            self.batchJob.jobStatus = JobStatus.Failure
        self.makeProgress(self.FINISHED_PROGRESS_NUMBER)
