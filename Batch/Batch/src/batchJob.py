# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

from jobStatus import JobStatus


class BatchJob():
    def __init__(self, id_in: str, jobStatus_in, progress_in: int):
        self.id = id_in
        self.jobStatus = jobStatus_in
        self.progress = progress_in

    def next(self):
        if self.jobStatus.value in [JobStatus.NotStarted, JobStatus.PreProcessing, JobStatus.Training]:
            self.jobStatus = JobStatus(self.jobStatus.value + 1)
        else:
            raise ValueError("Invalid job status value.")

    def makeProgress(self, progress: int):
        if progress < 0 or progress > 100:
            raise ValueError("Invalid progress value.")
        else:
            self.progress = progress


if __name__ == "__main__":
    b = BatchJob("", JobStatus.NotStarted, 0, "", 5, 24)
    b.next()
    assert(b.jobStatus == JobStatus.PreProcessing)
    b.makeProgress(5)
    assert(b.progress == 5)

    import json
    print(json.dumps(b.__dict__))
